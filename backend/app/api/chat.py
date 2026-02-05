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
        "This assistant is focused on Tomas and his work. "
        "I can help with questions about his experience, projects, "
        "or how he approaches problems."
    )


def _limit_message() -> str:
    return (
        "Thank you for your genuine interest! You’ve reached today’s free limit for AI Me. "
        "Should you have further questions, kindly email me instead."
    )


def _build_sources(chunks: list[ContextChunk]) -> list[dict]:
    sources: list[dict] = []
    for chunk in chunks:
        sources.append(
            {
                "doc_id": chunk.doc_id,
                "title": chunk.title,
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
