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
