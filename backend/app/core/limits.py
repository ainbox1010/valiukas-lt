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
