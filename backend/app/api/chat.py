import re
from typing import Literal

from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel, Field, field_validator

from app.core.cache import cache_get_json, cache_set_json, get_cache, hash_text
from app.core.config import get_settings
from app.core.limits import check_limits, get_limit_status
from app.core.logging import get_logger, safe_message_excerpt
from app.core.security import is_disallowed_topic, is_followup_affirmative
from app.llm.openai_client import create_response
from app.llm.prompts import build_prompt, get_prompt_version
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


class HistoryTurn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: str | None = None
    visitor_id: str | None = None
    auth: AuthPayload | None = None
    history: list[HistoryTurn] | None = None

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
        "Thank you for your genuine interest! You’ve reached today’s free limit for AI Me. "
        "Should you have further questions, kindly email me instead. "
        "If helpful, copy this conversation into your email so you don't have to explain everything again."
    )


def _sanitize_history(history: list[HistoryTurn] | None) -> list[dict]:
    if not history:
        return []
    out: list[dict] = []
    for turn in history:
        role = (turn.role or "").strip().lower()
        if role not in ("user", "assistant"):
            continue
        content = (turn.content or "").strip()
        if not content:
            continue
        out.append({"role": role, "content": content})
    return out[-6:]  # cap at 6


_QUESTION_STARTERS = frozenset({"how", "what", "why", "when", "where", "who"})


def _is_short_narrowing_reply(message: str) -> bool:
    """True if message is a short narrowing reply (e.g. 'inventory', 'documents').
    Excludes short question starters like 'how', 'what', 'why'."""
    words = message.strip().split()
    if not words or len(words) > 3:
        return False
    if words[0].lower() in _QUESTION_STARTERS:
        return False
    return True


def _retrieval_query(message: str, sanitized_history: list[dict]) -> str:
    """Compose retrieval query when current message is a follow-up (affirmative or short narrowing).
    Uses last substantive user message + current message so retrieval has full context."""
    should_compose = is_followup_affirmative(message) or _is_short_narrowing_reply(message)
    if not should_compose:
        return message
    if not sanitized_history:
        return message

    # Find last substantive user message (skip affirmatives and short narrowing)
    last_substantive: str | None = None
    for turn in reversed(sanitized_history):
        if turn.get("role") != "user":
            continue
        content = (turn.get("content") or "").strip()
        if not content:
            continue
        if is_followup_affirmative(content) or _is_short_narrowing_reply(content):
            continue
        last_substantive = content
        break

    if last_substantive:
        return f"{last_substantive} {message.strip()}"
    return message


def _normalize_for_match(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _detect_cta(message: str) -> str:
    """
    Return 'contact' when the user message clearly signals reach-out, commercial,
    or implementation intent. Return 'none' otherwise.
    CTA is determined only from the user message (no answer inspection).
    """
    msg = _normalize_for_match(message)

    reachout_patterns = [
        r"\bhow can i contact (the )?real you\b",
        r"\bhow can i contact you\b",
        r"\bhow do i contact you\b",
        r"\bcan i contact you\b",
        r"\bhow can we contact you\b",
        r"\bhow do we contact you\b",
        r"\bhow can i reach you\b",
        r"\bhow do i reach you\b",
        r"\bwhat is your email\b",
        r"\bwhat's your email\b",
        r"\bcan we talk\b",
        r"\bcan we discuss this\b",
        r"\bhow do we proceed\b",
        r"\bhow should we proceed\b",
        r"\bwhat is the next step\b",
        r"\bwhat are the next steps\b",
    ]

    commercial_patterns = [
        r"\bcan you make (me )?an offer\b",
        r"\bcan you send (me )?an offer\b",
        r"\bcan you give (me )?a quote\b",
        r"\bcan you send (me )?a quote\b",
        r"\bwhat would it cost\b",
        r"\bhow much would it cost\b",
        r"\bwhat is the cost\b",
        r"\bwhat is your price\b",
        r"\bwhat are your prices\b",
        r"\bwhat is your pricing\b",
        r"\bwhat are your rates\b",
        r"\bwhat do you charge\b",
        r"\bwhat is the budget\b",
    ]

    implementation_patterns = [
        r"\bcan you help us implement\b",
        r"\bcan you help implement\b",
        r"\bcan you do this for us\b",
        r"\bcould you do this for us\b",
        r"\bcan you build this\b",
        r"\bcould you build this\b",
        r"\bcan we work together\b",
        r"\bi want to work with you\b",
        r"\bwe want to work with you\b",
    ]

    engagement_patterns = [
        r"\bcan you build .* for (me|us)\b",
        r"\bcould you build .* for (me|us)\b",
        r"\bcan you implement .* for (me|us)\b",
        r"\bcould you implement .* for (me|us)\b",
        r"\bcan you develop .* for (me|us)\b",
        r"\bcould you develop .* for (me|us)\b",
        r"\bcan you create .* for (me|us)\b",
        r"\bcould you create .* for (me|us)\b",
        r"\bcan you make .* for (me|us)\b",
        r"\bcould you make .* for (me|us)\b",
        r"\bcan you do this for (me|us)\b",
        r"\bcould you do this for (me|us)\b",
        r"\bcan you help (me|us) (solve|implement)\b",
        r"\bcould you help (me|us) (solve|implement)\b",
    ]

    for pattern in (
        reachout_patterns
        + commercial_patterns
        + implementation_patterns
        + engagement_patterns
    ):
        if re.search(pattern, msg):
            return "contact"
    return "none"


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
            "cta": "contact",
            "limit_reached": True,
            "remaining": limit_result.remaining,
            "limit": limit_result.limit,
            "prompt_version": get_prompt_version(),
        }

    message_excerpt = safe_message_excerpt(payload.message)
    logger.info("chat_request auth=%s id=%s msg=%s", auth_type, identifier, message_excerpt)

    if is_disallowed_topic(payload.message):
        return {
            "answer": _refusal_message(),
            "sources": [],
            "cta": "none",
            "remaining": limit_result.remaining,
            "limit": limit_result.limit,
            "prompt_version": get_prompt_version(),
        }

    normalized = payload.message.strip().lower()
    if normalized in PRESET_QUESTION_SET:
        cached = cache_get_json(cache, f"answer:{hash_text(normalized)}")
        if cached and "answer" in cached:
            cta = _detect_cta(payload.message)
            return {
                "answer": cached["answer"],
                "sources": cached.get("sources", []),
                "cta": cta,
                "remaining": limit_result.remaining,
                "limit": limit_result.limit,
                "prompt_version": get_prompt_version(),
            }

    sanitized_history = _sanitize_history(payload.history)
    retrieval_query = _retrieval_query(payload.message, sanitized_history)
    context_chunks = retrieve_context(retrieval_query)
    sources = _build_sources(context_chunks)
    system_prompt, user_prompt = build_prompt(payload.message, context_chunks)

    api_key = payload.auth.byok_token if (payload.auth and payload.auth.type == "byok") else settings.OPENAI_API_KEY
    answer = create_response(
        system_prompt, user_prompt, settings.OPENAI_MODEL, api_key, history=sanitized_history
    )

    if normalized in PRESET_QUESTION_SET:
        cache_set_json(
            cache,
            f"answer:{hash_text(normalized)}",
            {"answer": answer, "sources": sources},
            ttl_seconds=86400,
        )

    cta = _detect_cta(payload.message)
    return {
        "answer": answer,
        "sources": sources,
        "cta": cta,
        "remaining": limit_result.remaining,
        "limit": limit_result.limit,
        "prompt_version": get_prompt_version(),
    }


@router.get("/limits")
def limits(request: Request, visitor_id: str | None = Query(default=None)) -> dict:
    cache = get_cache()
    auth_type = "anonymous"
    identifier = _resolve_identifier(None, request, visitor_id)
    status = get_limit_status(cache, auth_type, identifier)
    return {"remaining": status.remaining, "limit": status.limit}
