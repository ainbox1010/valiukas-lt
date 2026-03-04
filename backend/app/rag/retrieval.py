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


def _dedupe(chunks: list[ContextChunk]) -> list[ContextChunk]:
    seen = set()
    unique: list[ContextChunk] = []
    for chunk in chunks:
        key = (chunk.chunk_id or chunk.text[:120]).strip()
        if key in seen:
            continue
        seen.add(key)
        unique.append(chunk)
    return unique


def _dedupe_by_slug(chunks: list[ContextChunk], max_per_slug: int = 1) -> list[ContextChunk]:
    """Keep best chunk(s) per slug for broad coverage (e.g. 'list all projects')."""
    by_slug: dict[str, list[ContextChunk]] = {}
    for chunk in chunks:
        slug = chunk.slug or "unknown"
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


def retrieve_context(message: str) -> list[ContextChunk]:
    cache = get_cache()

    message_hash = hash_text(message)
    cached = cache_get_json(cache, f"retrieval:{message_hash}")
    if cached and "chunks" in cached:
        return [
            ContextChunk(**{**c, "slug": c.get("slug")})
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

    all_matches: list = []
    for namespace in PROJECT_NAMESPACES:
        try:
            query_kwargs = dict(
                vector=embedding,
                top_k=50,
                include_metadata=True,
                namespace=namespace,
            )
            # Apply partner filter only to project namespaces (CV has no partner)
            if metadata_filter and namespace in PROJECT_ONLY_NAMESPACES:
                query_kwargs["filter"] = metadata_filter
            query_result = index.query(**query_kwargs)
            matches = query_result.get("matches", []) if isinstance(query_result, dict) else query_result.matches
            all_matches.extend(matches)
        except Exception as e:
            if "namespace not found" not in str(e).lower():
                logger.warning("retrieve_context namespace=%s error=%s", namespace, e)

    # Sort by score descending (higher = more relevant)
    def _score(m):
        return m.get("score") if isinstance(m, dict) else getattr(m, "score", None) or 0.0

    all_matches.sort(key=_score, reverse=True)

    chunks: list[ContextChunk] = []
    for match in all_matches:
        metadata = match.get("metadata", {}) if isinstance(match, dict) else match.metadata or {}
        score = match.get("score") if isinstance(match, dict) else match.score
        slug = metadata.get("slug")
        chunk_index = metadata.get("chunk_index")
        chunk_id = f"{slug}:{chunk_index}" if slug is not None and chunk_index is not None else metadata.get("chunk_id")
        chunks.append(
            ContextChunk(
                text=metadata.get("text", ""),
                doc_id=metadata.get("doc_id"),
                title=metadata.get("title"),
                slug=slug,
                section=metadata.get("section"),
                source=metadata.get("filepath") or metadata.get("source"),
                chunk_id=chunk_id,
                score=score,
            )
        )

    chunks = _dedupe([chunk for chunk in chunks if chunk.text])
    # One chunk per slug to avoid duplicates (public vs RAG) in list answers
    chunks = _dedupe_by_slug(chunks, max_per_slug=1)[:24]

    cache_set_json(
        cache,
        f"retrieval:{message_hash}",
        {"chunks": [chunk.__dict__ for chunk in chunks]},
        ttl_seconds=600,
    )

    return chunks
