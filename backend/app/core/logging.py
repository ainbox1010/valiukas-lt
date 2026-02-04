import logging
import re

from .config import get_settings

_TOKEN_PATTERN = re.compile(r"sk-[A-Za-z0-9_-]{10,}")


def _mask_tokens(text: str) -> str:
    return _TOKEN_PATTERN.sub("sk-***", text)


def _truncate(text: str, max_len: int = 200) -> str:
    if len(text) <= max_len:
        return text
    return text[:max_len].rstrip() + "..."


def safe_message_excerpt(text: str) -> str:
    settings = get_settings()
    if settings.ENV == "prod":
        return f"[len={len(text)}]"
    return _truncate(_mask_tokens(text))


def get_logger(name: str) -> logging.Logger:
    settings = get_settings()
    logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))
    return logging.getLogger(name)
