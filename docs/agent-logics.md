# AI Me — Agent Logic & Reply Behaviour

All files that influence AI Me chat reply behaviour, with full content.

---

## File Structure

```
backend/
  app/
    api/chat.py              # Main chat endpoint, orchestration
    core/security.py         # Safeguard: is_disallowed_topic, is_in_scope, is_followup_affirmative
    core/limits.py          # Rate limits (anonymous 5/day, etc.)
    llm/prompts.py          # System prompt, build_prompt()
    llm/openai_client.py    # create_response(), get_embedding()
    rag/retrieval.py        # retrieve_context(), RAG from Pinecone

frontend/
  src/app/
    api/chat/route.ts       # Proxies to backend, sends { message, visitor_id }
    ai/page.tsx             # Chat UI, sends only current message

.cursor/rules/
  ai-me-product-behavior.mdc  # Product behaviour rules
```

---

## backend/app/api/chat.py

```python
from typing import Literal

from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel, Field, field_validator

from app.core.cache import cache_get_json, cache_set_json, get_cache, hash_text
from app.core.config import get_settings
from app.core.limits import check_limits, get_limit_status
from app.core.logging import get_logger, safe_message_excerpt
from app.core.security import is_disallowed_topic, is_in_scope
from app.llm.openai_client import create_response
from app.llm.prompts import build_prompt
from app.rag.retrieval import ContextChunk, retrieve_context

router = APIRouter()
logger = get_logger(__name__)

PRESET_QUESTIONS = [
    "What do you work on?",
    "How do you think about building products?",
    "What are your core skills?",
    "What kinds of problems do you enjoy solving?",
    "Tell me about your background",
    "What are you building now?",
    "Who should work with you?",
    "How can I contact the real you?",
]
PRESET_QUESTION_SET = {question.lower() for question in PRESET_QUESTIONS}


class AuthPayload(BaseModel):
    type: Literal["anonymous", "verified", "byok"] = "anonymous"
    sub: str | None = None
    byok_token: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str | None = None
    visitor_id: str | None = None
    auth: AuthPayload | None = None

    @field_validator("message")
    @classmethod
    def normalize_message(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Message cannot be empty.")
        return trimmed


def _resolve_identifier(
    payload: ChatRequest | None, request: Request | None, visitor_id: str | None = None
) -> str:
    if visitor_id:
        return visitor_id
    if payload:
        if payload.auth and payload.auth.sub:
            return payload.auth.sub
        if payload.visitor_id:
            return payload.visitor_id
        if payload.session_id:
            return payload.session_id
    if request and request.client:
        return request.client.host
    return "unknown"


def _refusal_message() -> str:
    return (
        "This assistant is focused my experience and my work. "
        "I can help with questions about my projects, "
        "or how I approach product development."
    )


def _limit_message() -> str:
    return (
        "Thank you for your genuine interest! You've reached today's free limit for AI Me. "
        "Should you have further questions, kindly email me instead."
    )


def _build_sources(chunks: list[ContextChunk]) -> list[dict]:
    sources: list[dict] = []
    for chunk in chunks:
        sources.append(
            {
                "doc_id": chunk.doc_id,
                "title": chunk.title,
                "slug": chunk.slug,
                "section": chunk.section,
                "chunk_id": chunk.chunk_id,
                "score": chunk.score,
            }
        )
    return sources


@router.post("/chat")
def chat(payload: ChatRequest, request: Request) -> dict:
    settings = get_settings()
    cache = get_cache()

    auth_type = payload.auth.type if payload.auth else "anonymous"

    if auth_type == "byok" and not (payload.auth and payload.auth.byok_token):
        raise HTTPException(status_code=400, detail="Missing BYOK token.")

    identifier = _resolve_identifier(payload, request)
    limit_result = check_limits(cache, auth_type, identifier)
    if not limit_result.allowed:
        logger.info(
            "rate_limit auth=%s id=%s reason=%s",
            auth_type,
            identifier,
            limit_result.reason,
        )
        return {
            "answer": _limit_message(),
            "sources": [],
            "limit_reached": True,
            "remaining": limit_result.remaining,
            "limit": limit_result.limit,
        }

    message_excerpt = safe_message_excerpt(payload.message)
    logger.info("chat_request auth=%s id=%s msg=%s", auth_type, identifier, message_excerpt)

    if is_disallowed_topic(payload.message):
        return {
            "answer": _refusal_message(),
            "sources": [],
            "remaining": limit_result.remaining,
            "limit": limit_result.limit,
        }

    if not is_in_scope(payload.message):
        return {
            "answer": _refusal_message(),
            "sources": [],
            "remaining": limit_result.remaining,
            "limit": limit_result.limit,
        }

    normalized = payload.message.strip().lower()
    if normalized in PRESET_QUESTION_SET:
        cached = cache_get_json(cache, f"answer:{hash_text(normalized)}")
        if cached and "answer" in cached:
            return {
                "answer": cached["answer"],
                "sources": cached.get("sources", []),
                "remaining": limit_result.remaining,
                "limit": limit_result.limit,
            }

    context_chunks = retrieve_context(payload.message)
    sources = _build_sources(context_chunks)
    system_prompt, user_prompt = build_prompt(payload.message, context_chunks)

    api_key = payload.auth.byok_token if (payload.auth and payload.auth.type == "byok") else settings.OPENAI_API_KEY
    answer = create_response(system_prompt, user_prompt, settings.OPENAI_MODEL, api_key)

    if normalized in PRESET_QUESTION_SET:
        cache_set_json(
            cache,
            f"answer:{hash_text(normalized)}",
            {"answer": answer, "sources": sources},
            ttl_seconds=86400,
        )

    return {
        "answer": answer,
        "sources": sources,
        "remaining": limit_result.remaining,
        "limit": limit_result.limit,
    }


@router.get("/limits")
def limits(request: Request, visitor_id: str | None = Query(default=None)) -> dict:
    cache = get_cache()
    auth_type = "anonymous"
    identifier = _resolve_identifier(None, request, visitor_id)
    status = get_limit_status(cache, auth_type, identifier)
    return {"remaining": status.remaining, "limit": status.limit}
```

---

## backend/app/core/security.py

```python
import re


_BANNED_TOPICS = re.compile(
    r"\b(sex|porn|nsfw|nude|nudes|drugs|cocaine|heroin|meth|illegal|crime)\b",
    re.IGNORECASE,
)


def is_disallowed_topic(message: str) -> bool:
    return _BANNED_TOPICS.search(message) is not None


# Short affirmative replies that may be follow-ups to "Would you like me to dive deeper?" etc.
# Treat as in-scope so we don't refuse; let the LLM handle (may ask for clarification without history).
_FOLLOWUP_AFFIRMATIVE = re.compile(
    r"^(yes|yeah|yep|yup|yea|sure|please|ok|okay|go ahead|go on|absolutely|definitely|of course|continue|expand|more|tell me more|elaborate)(\s+please)?\.?$",
    re.IGNORECASE,
)


def is_followup_affirmative(message: str) -> bool:
    """True if message is a short affirmative that could be a follow-up reply."""
    return _FOLLOWUP_AFFIRMATIVE.match(message.strip()) is not None


def is_in_scope(message: str) -> bool:
    if is_followup_affirmative(message):
        return True
    lowered = message.lower()
    keywords = [
        "tomas",
        "valiukas",
        "you",
        "your",
        "ai me",
        "experience",
        "projects",
        "work",
        "background",
        "this site",
        "this website",
        "dev stack",
        "tech stack",
        "architecture",
        "stack",
        "partner",
        "partners",
        "erobot",
        "beelogic",
        "darius",
        "gudaciauskas",
    ]
    if any(kw in lowered for kw in keywords):
        return True
    if re.search(r"how\s+(was|is)\s+.*(built|made|created)", lowered):
        return True
    return False
```

---

## backend/app/core/limits.py

```python
from dataclasses import dataclass

from .cache import CacheBackend


@dataclass(frozen=True)
class LimitConfig:
    total_cap: int | None
    total_window_seconds: int | None
    rpm_cap: int


LIMITS: dict[str, LimitConfig] = {
    "anonymous": LimitConfig(total_cap=5, total_window_seconds=None, rpm_cap=10),
    "verified": LimitConfig(total_cap=20, total_window_seconds=86400, rpm_cap=30),
    "byok": LimitConfig(total_cap=None, total_window_seconds=None, rpm_cap=60),
}


class LimitResult:
    def __init__(
        self,
        allowed: bool,
        reason: str | None = None,
        remaining: int | None = None,
        limit: int | None = None,
    ) -> None:
        self.allowed = allowed
        self.reason = reason
        self.remaining = remaining
        self.limit = limit


def check_limits(
    cache: CacheBackend, category: str, identifier: str
) -> LimitResult:
    config = LIMITS.get(category, LIMITS["anonymous"])

    rpm_key = f"rpm:{category}:{identifier}"
    rpm_count = cache.incr(rpm_key, ttl_seconds=60)
    if rpm_count > config.rpm_cap:
        return LimitResult(False, "rate_limited", remaining=0, limit=config.total_cap)

    if config.total_cap is not None:
        cap_key = f"cap:{category}:{identifier}"
        cap_count = cache.incr(cap_key, ttl_seconds=config.total_window_seconds)
        remaining = max(0, config.total_cap - cap_count)
        if cap_count > config.total_cap:
            return LimitResult(False, "cap_reached", remaining=0, limit=config.total_cap)

        return LimitResult(True, remaining=remaining, limit=config.total_cap)

    return LimitResult(True, remaining=None, limit=None)


def get_limit_status(
    cache: CacheBackend, category: str, identifier: str
) -> LimitResult:
    config = LIMITS.get(category, LIMITS["anonymous"])

    if config.total_cap is None:
        return LimitResult(True, remaining=None, limit=None)

    cap_key = f"cap:{category}:{identifier}"
    raw_count = cache.get(cap_key)
    current_count = int(raw_count) if raw_count else 0
    remaining = max(0, config.total_cap - current_count)
    return LimitResult(remaining > 0, remaining=remaining, limit=config.total_cap)
```

---

## backend/app/llm/prompts.py

```python
from app.rag.retrieval import ContextChunk


SYSTEM_PROMPT = """
You are an AI representation of Tomas.

You answer questions about:
- my professional background and career
- my projects (including this website and AI Me)
- my partners (companies and people I collaborate with)
- the architecture, technology, and implementation of my systems
- my methodology and decision-making approach
- my education (when explicitly relevant)

Speak in first person ("I").
Do not refer to yourself in third person.

Interpret generally phrased questions (e.g., "When should RPA be used?") as asking how I approach that decision.
Questions about "this site", "AI Me", or "how this was built" are within scope and refer to my own architecture, stack, and implementation decisions.

Answering rules:

1) If the user asks about my background, experience, or career:

   - If CV/background sources (namespace dev_ai_me) are present, base the company/role list strictly on those sources.
   - Do not treat partners or project collaborators as employers unless explicitly stated in the CV.
   - You MUST explicitly list the companies or organizations where I worked.
   - Present them clearly in a bullet list or structured format.
   - For each company, briefly state:
        • role/title (if available)
        • main responsibility
        • period (if available)
   - Do NOT replace companies with sectors or project lists.
   - Do NOT summarize abstractly without naming companies.
   - After listing companies, summarize my progression and current focus.
   - Mention at most 1–2 representative projects only if helpful.
   - Mention education briefly at the end unless explicitly asked.

2) If the user explicitly asks about education:
   - Provide education chronologically.

3) If the user asks about projects:
   - Use project sources.
   - List each unique project once (deduplicate by slug).
   - Use official project titles only.
   - Do not exhaustively list every related project unless explicitly requested.

4) If the user asks about methodology or decision-making:
   - Use my documented approach and methodology.
   - Be structured and practical.
   - Use at most 3 representative examples unless asked for more.

5) If the user asks about partners (companies like erobot.ai, beelogic.io, or people like Darius Gudačiauskas):
   - Use partner and project sources when available.
   - Describe the collaboration model and what they do; do not present partners as employers unless the CV states so.
   - If no relevant source is retrieved, say so.

General style rules:
- Provide a short answer first (max ~8 lines).
- Expand only if useful.
- Avoid excessive enumeration.
- Avoid replacing companies with sectors.
- Prefer structured clarity over narrative abstraction.
- If information is not in the provided sources, say so explicitly.
- Be calm, precise, and pragmatic.
- Formatting: Use bullets (-) for lists. If you use numbers, use 1., 2., 3. in sequence—never repeat "1." for different items.
""".strip()


def _format_chunk(chunk: ContextChunk) -> str:
    metadata = []
    if chunk.namespace:
        metadata.append(f"namespace: {chunk.namespace}")
    if chunk.slug:
        metadata.append(f"slug: {chunk.slug}")
    if chunk.title:
        metadata.append(f"title: {chunk.title}")
    if chunk.section:
        metadata.append(f"section: {chunk.section}")
    if chunk.doc_id:
        metadata.append(f"doc_id: {chunk.doc_id}")
    if chunk.source:
        metadata.append(f"source: {chunk.source}")
    meta_line = " | ".join(metadata)
    return f"{meta_line}\n{chunk.text}".strip()


def build_prompt(message: str, chunks: list[ContextChunk]) -> tuple[str, str]:
    if chunks:
        context_block = "\n\n---\n\n".join(_format_chunk(chunk) for chunk in chunks)
    else:
        context_block = "No supporting sources were retrieved."

    user_prompt = (
        "Context sources:\n"
        f"{context_block}\n\n"
        "User question:\n"
        f"{message}\n\n"
        "Answer using the sources when possible. "
        "If the user asks for a factual claim not supported by sources, say: \"I don't have that documented.\" "
        "When listing projects, list each unique project once (by slug); do not list the same project twice. "
        "Do not include slugs or paths (e.g. projects/xxx) in your answer; use project titles only. "
        "Use bullets (-) for lists, or numbers 1., 2., 3. in sequence—never repeat '1.' for different items."
    )

    return SYSTEM_PROMPT, user_prompt
```

---

## backend/app/llm/openai_client.py

```python
from __future__ import annotations

from openai import OpenAI

from app.core.cache import cache_get_json, cache_set_json, get_cache, hash_text
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _get_client(api_key: str) -> OpenAI:
    return OpenAI(api_key=api_key)


def get_embedding(text: str) -> list[float]:
    settings = get_settings()
    cache = get_cache()
    cache_key = f"embedding:{hash_text(text)}"
    cached = cache_get_json(cache, cache_key)
    if cached and "embedding" in cached:
        return cached["embedding"]

    client = _get_client(settings.OPENAI_API_KEY)
    response = client.embeddings.create(model=settings.OPENAI_EMBED_MODEL, input=text)
    embedding = response.data[0].embedding

    cache_set_json(cache, cache_key, {"embedding": embedding}, ttl_seconds=1800)
    return embedding


def get_embeddings_batch(
    texts: list[str],
    batch_size: int = 64,
) -> list[list[float]]:
    """
    Embed multiple texts in batches. No caching (for ingestion pipeline).
    Retries on 429 with exponential backoff.
    """
    import time

    settings = get_settings()
    client = _get_client(settings.OPENAI_API_KEY)
    results: list[list[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        for attempt in range(5):
            try:
                response = client.embeddings.create(
                    model=settings.OPENAI_EMBED_MODEL,
                    input=batch,
                )
                for d in response.data:
                    results.append(d.embedding)
                break
            except Exception as e:
                if "429" in str(e) or "rate" in str(e).lower():
                    wait = 2 ** attempt
                    logger.warning("Rate limited, retrying in %ds", wait)
                    time.sleep(wait)
                else:
                    raise
    return results


def create_response(
    system_prompt: str, user_prompt: str, model: str, api_key: str
) -> str:
    client = _get_client(api_key)

    if hasattr(client, "responses"):
        response = client.responses.create(
            model=model,
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        if hasattr(response, "output_text") and response.output_text:
            return response.output_text.strip()

        if hasattr(response, "output") and response.output:
            for item in response.output:
                for content in item.content:
                    if hasattr(content, "text") and content.text:
                        return content.text.strip()
    else:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content.strip()

    raise ValueError("No response text returned.")
```

---

## backend/app/rag/retrieval.py

```python
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
        sorted_chunks = sorted(
            slug_chunks,
            key=lambda c: c.score or 0.0,
            reverse=True,
        )
        result.extend(sorted_chunks[:max_per_slug])
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
        cv_matches = _query_ns(CV_NAMESPACE, top_k=12)
        proj_public = _query_ns("projects_public", top_k=2)
        proj_rag = _query_ns("projects_rag", top_k=2)
        cv_matches.sort(key=_score, reverse=True)
        proj_tagged = [(m, "projects_public") for m in proj_public] + [(m, "projects_rag") for m in proj_rag]
        proj_tagged.sort(key=lambda x: _score(x[0]), reverse=True)
        all_tagged: list[tuple[object, str]] = [(m, CV_NAMESPACE) for m in cv_matches] + proj_tagged
    else:
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
```

---

## frontend/src/app/api/chat/route.ts

```typescript
import { NextResponse } from "next/server";

type ChatRequestBody = {
  message?: string;
  visitor_id?: string;
};

export async function POST(request: Request) {
  const backendUrl = process.env.BACKEND_URL;

  if (!backendUrl) {
    return NextResponse.json(
      { error: "Backend URL is not configured." },
      { status: 500 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json(
      { error: "Message is required." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: body.message,
        visitor_id: body.visitor_id ?? undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Upstream error." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Upstream unavailable." },
      { status: 502 }
    );
  }
}
```

---

## frontend/src/app/ai/page.tsx (chat-relevant parts)

```typescript
// Constants that affect behaviour
const initialMessage: ChatMessage = {
  id: "init",
  role: "assistant",
  content:
    "I represent Tomas's work and thinking.\nAsk about projects — or describe your situation, and I'll respond using his approach to automation and AI.",
};

const suggestedQuestions = [
  "What is your background?",
  "Tell me about a real automation project you implemented.",
  "How do you decide between RPA, AI, and custom software?",
  "How do you evaluate whether AI is actually needed?",
  "How would you design an AI-assisted automation system?",
];

// sendMessage only sends current message
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: trimmed, visitor_id: getVisitorId() }),
});
```

---

## .cursor/rules/ai-me-product-behavior.mdc

```markdown
# AI Me — Product Behavior Rules

## 1) Limits & escalation policy
- Current blunt cap exists; migrate to contextual escalation without changing architecture.
- Hard stop only for abuse/quota; otherwise use soft escalation + CTAs.
- Backend returns explicit status fields for frontend (e.g., ok | limit_reached | out_of_scope | abuse_suspected).
- When limit is reached, response must always be the limit message (not scope refusal).

## 2) Proactive lead trigger rules (NO agents)
- Keep one-shot LLM call only. No LangGraph/agent loops.
- Deterministic triggers for "talk to me" CTA:
  - user asks "can you / is it possible / help with"
  - query mentions documents/proposals/contracts + automation/workflows + volume
  - retrieval confidence is high (e.g., >=2 sources or score threshold)
- Backend may set fields like: confidence=low|med|high and cta=none|talk|calendly|email.
- Assistant may recommend a call when confidence is high; must not be pushy.

## 3) Contact funnel & Calendly policy
- Preferred funnel: AI Me qualifies → selective escalation → Calendly link.
- Do not expose email broadly; use email only as fallback CTA.
- Calendly CTA appears only on explicit request or high-confidence fit.
- Optional phrasing: "If you're serious, book a call."
- Optional: auto-generate call topic from chat summary (deterministic or one-shot LLM within existing call).

## 4) Tone policy
- Tone: professional, grounded, direct. Light opinions allowed.
- Avoid marketing fluff.
- Be explicit when something is not supported/possible.
- Preserve RAG discipline: say "not in my sources" when missing.

## 5) Follow-up / continuation context
- When the assistant offers a follow-up (e.g. "Would you like me to dive deeper on this?") and the user replies "yes", "sure", "please", etc., treat it as continuation of the same topic.
- The safeguard must NOT treat such affirmative replies as out-of-scope or "no pass"; the user is accepting the offered follow-up, not starting a new unrelated query.

## 6) Implementation reminders
- No additional OpenAI calls introduced "for convenience".
- Frontend renders CTAs based on backend status/cta fields.
- Keep security posture: no logging of keys/prompts; minimal PII.
```

---

## Reply Flow (Current)

1. **Frontend** → POST `{ message, visitor_id }` to `/api/chat`
2. **API route** → Forwards to backend `POST /chat`
3. **Backend chat.py**:
   - Check limits → if exceeded, return limit message
   - `is_disallowed_topic(message)` → if true, return refusal
   - `is_in_scope(message)` → if false, return refusal
   - Preset cache (optional) → return cached answer
   - `retrieve_context(message)` → RAG chunks
   - `build_prompt(message, chunks)` → system + user prompt
   - `create_response()` → OpenAI → answer
4. **Response** → `{ answer, sources, remaining, limit }`

---

## Implementation Notes: Conversation History

**Current state:** The backend is stateless. Each request contains only the current message. No conversation history is sent or used.

**Problem:** When the user says "yes" to "Would you like me to dive deeper?", the safeguard now lets it through (via `is_followup_affirmative`). But:
- Retrieval runs on "yes" → returns little or nothing useful
- The LLM gets "User question: yes" with no prior context
- The model may ask for clarification or give a generic reply, but cannot expand on the previous answer

**To improve:** Add conversation history so the LLM has context.

**Effort:** Moderate — a few hours.

**What's involved:**

1. **Frontend** — Already has messages in state. Add `history` to the request (e.g. last 5–10 turns: `[{ role, content }]`).
2. **Backend** — Extend `ChatRequest` to accept optional `history`. Pass it into the prompt builder and LLM call.
3. **LLM call** — Use Chat Completions with a `messages` array: `[system, ...history, { role: "user", content: newMessage }]`. Check `create_response` and switch to chat format if needed.
4. **Retrieval** — For follow-up affirmatives ("yes", "sure"), retrieval on that text alone returns nothing. Use the previous user message (or last substantive question) for retrieval when a follow-up is detected.
5. **Token limits** — Cap history (e.g. last 4–6 exchanges) to avoid exceeding the context window.

**Design choice:** How to handle retrieval for "yes" — e.g. use the last user question for embedding/retrieval, or pass the last assistant answer into the prompt as context.
