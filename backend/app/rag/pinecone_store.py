from functools import lru_cache

from pinecone import Pinecone

from app.core.config import get_settings


@lru_cache
def get_pinecone_index():
    settings = get_settings()
    client = Pinecone(api_key=settings.PINECONE_API_KEY)
    return client.Index(settings.PINECONE_INDEX)
