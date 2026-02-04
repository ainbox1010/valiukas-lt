from __future__ import annotations

from dataclasses import dataclass

from app.core.cache import cache_get_json, cache_set_json, get_cache, hash_text
from app.core.config import get_settings
from app.core.logging import get_logger
from app.llm.openai_client import get_embedding
from app.rag.pinecone_store import get_pinecone_index

logger = get_logger(__name__)


@dataclass
class ContextChunk:
    text: str
    doc_id: str | None
    title: str | None
    section: str | None
    source: str | None
    chunk_id: str | None


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


def retrieve_context(message: str) -> list[ContextChunk]:
    settings = get_settings()
    cache = get_cache()

    message_hash = hash_text(message)
    cached = cache_get_json(cache, f"retrieval:{message_hash}")
    if cached and "chunks" in cached:
        return [ContextChunk(**chunk) for chunk in cached["chunks"]]

    embedding = get_embedding(message)
    index = get_pinecone_index()

    query_result = index.query(
        vector=embedding,
        top_k=12,
        include_metadata=True,
        namespace=settings.PINECONE_NAMESPACE,
    )

    matches = query_result.get("matches", []) if isinstance(query_result, dict) else query_result.matches

    chunks: list[ContextChunk] = []
    for match in matches:
        metadata = match.get("metadata", {}) if isinstance(match, dict) else match.metadata
        chunks.append(
            ContextChunk(
                text=metadata.get("text", ""),
                doc_id=metadata.get("doc_id"),
                title=metadata.get("title"),
                section=metadata.get("section"),
                source=metadata.get("source"),
                chunk_id=metadata.get("chunk_id"),
            )
        )

    chunks = _dedupe([chunk for chunk in chunks if chunk.text])
    chunks = chunks[:6]

    cache_set_json(
        cache,
        f"retrieval:{message_hash}",
        {"chunks": [chunk.__dict__ for chunk in chunks]},
        ttl_seconds=600,
    )

    return chunks
