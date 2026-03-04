from __future__ import annotations

from dataclasses import dataclass

from app.core.cache import cache_get_json, cache_set_json, get_cache, hash_text
from app.core.config import get_settings
from app.core.logging import get_logger
from app.llm.openai_client import get_embedding
from app.rag.pinecone_store import get_pinecone_index

logger = get_logger(__name__)


PROJECT_NAMESPACES = ("projects_public", "projects_rag", "dev_ai_me")
PROJECT_ONLY_NAMESPACES = ("projects_public", "projects_rag")
CV_NAMESPACE = "dev_ai_me"

# Keywords that indicate user is asking about CV/background/career
BACKGROUND_INTENT_KEYWORDS = [
    "cv", "resume", "background", "career", "work history", "employment",
    "where did you work", "companies", "roles", "experience", "worked at",
]


def _detect_background_intent(message: str) -> bool:
    """True if the query is about CV, background, career, or employment."""
    msg_lower = message.lower().strip()
    return any(kw in msg_lower for kw in BACKGROUND_INTENT_KEYWORDS)


# Partner names as stored in metadata -> query keywords (lowercase)
PARTNER_FILTER_MAP = {
    "erobot.ai": ["erobot", "erobot.ai"],
    "beelogic.io": ["beelogic", "beelogic.io"],
}


def _detect_partner_filter(message: str) -> str | None:
    """If query clearly implies a partner filter, return the partner value."""
    msg_lower = message.lower()
    for partner, keywords in PARTNER_FILTER_MAP.items():
        if any(kw in msg_lower for kw in keywords):
            return partner
    return None


@dataclass
class ContextChunk:
    text: str
    doc_id: str | None
    title: str | None
    slug: str | None  # For citation link: /projects/{slug}
    section: str | None
    source: str | None
    chunk_id: str | None
    score: float | None
    namespace: str | None = None  # e.g. dev_ai_me, projects_public, projects_rag
    vector_id: str | None = None  # Pinecone vector id, for dedupe


def _dedupe(chunks: list[ContextChunk], namespace_aware: bool = False) -> list[ContextChunk]:
    seen = set()
    unique: list[ContextChunk] = []
    for chunk in chunks:
        if namespace_aware and chunk.namespace and (chunk.vector_id or chunk.chunk_id):
            key = (chunk.namespace, chunk.vector_id or chunk.chunk_id)
        else:
            key = (chunk.chunk_id or chunk.text[:120]).strip()
        if key in seen:
            continue
        seen.add(key)
        unique.append(chunk)
    return unique


def _dedupe_by_slug(chunks: list[ContextChunk], max_per_slug: int = 1) -> list[ContextChunk]:
    """Keep best chunk(s) per slug for broad coverage. For chunks without slug (e.g. CV), use chunk_id/vector_id so each is kept."""
    by_slug: dict[str, list[ContextChunk]] = {}
    for chunk in chunks:
        slug = chunk.slug or chunk.chunk_id or chunk.vector_id or "unknown"
        if slug not in by_slug:
            by_slug[slug] = []
        by_slug[slug].append(chunk)
    result: list[ContextChunk] = []
    for slug_chunks in by_slug.values():
        # Sort by score descending, take top max_per_slug
        sorted_chunks = sorted(
            slug_chunks,
            key=lambda c: c.score or 0.0,
            reverse=True,
        )
        result.extend(sorted_chunks[:max_per_slug])
    # Restore original order by score
    result.sort(key=lambda c: c.score or 0.0, reverse=True)
    return result


def _match_to_chunk(match: dict | object, namespace: str) -> ContextChunk | None:
    """Build ContextChunk from Pinecone match. Returns None if no text."""
    metadata = match.get("metadata", {}) if isinstance(match, dict) else match.metadata or {}
    text = metadata.get("text", "")
    if not text:
        return None
    score = match.get("score") if isinstance(match, dict) else match.score
    vector_id = match.get("id") if isinstance(match, dict) else getattr(match, "id", None)
    slug = metadata.get("slug")
    chunk_index = metadata.get("chunk_index")
    chunk_id = f"{slug}:{chunk_index}" if slug is not None and chunk_index is not None else metadata.get("chunk_id")
    return ContextChunk(
        text=text,
        doc_id=metadata.get("doc_id"),
        title=metadata.get("title"),
        slug=slug,
        section=metadata.get("section"),
        source=metadata.get("filepath") or metadata.get("source"),
        chunk_id=chunk_id,
        score=score,
        namespace=namespace,
        vector_id=vector_id,
    )


def retrieve_context(message: str) -> list[ContextChunk]:
    cache = get_cache()

    message_hash = hash_text(message)
    cached = cache_get_json(cache, f"retrieval:{message_hash}")
    if cached and "chunks" in cached:
        return [
            ContextChunk(
                text=c.get("text", ""),
                doc_id=c.get("doc_id"),
                title=c.get("title"),
                slug=c.get("slug"),
                section=c.get("section"),
                source=c.get("source"),
                chunk_id=c.get("chunk_id"),
                score=c.get("score"),
                namespace=c.get("namespace"),
                vector_id=c.get("vector_id"),
            )
            for c in cached["chunks"]
        ]

    embedding = get_embedding(message)
    index = get_pinecone_index()
    partner_filter = _detect_partner_filter(message)
    metadata_filter = (
        {"partner": {"$eq": partner_filter}}
        if partner_filter
        else None
    )
    background_intent = _detect_background_intent(message)

    def _score(m):
        return m.get("score") if isinstance(m, dict) else getattr(m, "score", None) or 0.0

    def _query_ns(ns: str, top_k: int) -> list:
        try:
            query_kwargs = dict(
                vector=embedding,
                top_k=top_k,
                include_metadata=True,
                namespace=ns,
            )
            if metadata_filter and ns in PROJECT_ONLY_NAMESPACES:
                query_kwargs["filter"] = metadata_filter
            result = index.query(**query_kwargs)
            matches = result.get("matches", []) if isinstance(result, dict) else result.matches
            return matches
        except Exception as e:
            if "namespace not found" not in str(e).lower():
                logger.warning("retrieve_context namespace=%s error=%s", ns, e)
            return []

    if background_intent:
        # CV first (dev_ai_me), then optional project context
        cv_matches = _query_ns(CV_NAMESPACE, top_k=12)
        proj_public = _query_ns("projects_public", top_k=2)
        proj_rag = _query_ns("projects_rag", top_k=2)
        cv_matches.sort(key=_score, reverse=True)
        proj_tagged = [(m, "projects_public") for m in proj_public] + [(m, "projects_rag") for m in proj_rag]
        proj_tagged.sort(key=lambda x: _score(x[0]), reverse=True)
        all_tagged: list[tuple[object, str]] = [(m, CV_NAMESPACE) for m in cv_matches] + proj_tagged
    else:
        # Default: query all namespaces, merge by score
        all_tagged: list[tuple[object, str]] = []
        for ns in PROJECT_NAMESPACES:
            matches = _query_ns(ns, top_k=50)
            all_tagged.extend((m, ns) for m in matches)
        all_tagged.sort(key=lambda x: _score(x[0]), reverse=True)

    chunks: list[ContextChunk] = []
    for match, namespace in all_tagged:
        chunk = _match_to_chunk(match, namespace)
        if chunk:
            chunks.append(chunk)

    chunks = _dedupe(chunks, namespace_aware=background_intent)
    chunks = _dedupe_by_slug(chunks, max_per_slug=1)[:24]

    cache_set_json(
        cache,
        f"retrieval:{message_hash}",
        {"chunks": [chunk.__dict__ for chunk in chunks]},
        ttl_seconds=600,
    )

    return chunks
