import json
import time
from dataclasses import dataclass
import hashlib

import redis

from .config import get_settings


class CacheBackend:
    def get(self, key: str) -> str | None:
        raise NotImplementedError

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> None:
        raise NotImplementedError

    def incr(self, key: str, ttl_seconds: int | None = None) -> int:
        raise NotImplementedError


@dataclass
class _CacheEntry:
    value: str
    expires_at: float | None


class InMemoryCache(CacheBackend):
    def __init__(self) -> None:
        self._store: dict[str, _CacheEntry] = {}

    def _is_expired(self, entry: _CacheEntry) -> bool:
        return entry.expires_at is not None and entry.expires_at <= time.time()

    def get(self, key: str) -> str | None:
        entry = self._store.get(key)
        if not entry:
            return None
        if self._is_expired(entry):
            self._store.pop(key, None)
            return None
        return entry.value

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> None:
        expires_at = time.time() + ttl_seconds if ttl_seconds else None
        self._store[key] = _CacheEntry(value=value, expires_at=expires_at)

    def incr(self, key: str, ttl_seconds: int | None = None) -> int:
        current = self.get(key)
        next_value = int(current) + 1 if current is not None else 1
        self.set(key, str(next_value), ttl_seconds=ttl_seconds)
        return next_value


class RedisCache(CacheBackend):
    def __init__(self, url: str) -> None:
        self._client = redis.Redis.from_url(url, decode_responses=True)

    def get(self, key: str) -> str | None:
        return self._client.get(key)

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> None:
        if ttl_seconds:
            self._client.setex(key, ttl_seconds, value)
        else:
            self._client.set(key, value)

    def incr(self, key: str, ttl_seconds: int | None = None) -> int:
        value = self._client.incr(key)
        if ttl_seconds:
            self._client.expire(key, ttl_seconds)
        return value


def get_cache() -> CacheBackend:
    settings = get_settings()
    if settings.REDIS_URL:
        return RedisCache(settings.REDIS_URL)
    return InMemoryCache()


def cache_get_json(cache: CacheBackend, key: str) -> dict | None:
    raw = cache.get(key)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def cache_set_json(
    cache: CacheBackend, key: str, value: dict, ttl_seconds: int | None = None
) -> None:
    cache.set(key, json.dumps(value), ttl_seconds=ttl_seconds)


def hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
