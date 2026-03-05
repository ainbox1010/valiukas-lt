from functools import lru_cache
import os
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_ROOT / ".env"


def _load_env_file() -> None:
    """Load backend/.env into os.environ so it works in uvicorn --reload subprocess."""
    env_path = _ENV_FILE if _ENV_FILE.exists() else Path.cwd() / ".env"
    if not env_path.exists():
        return
    try:
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key:
                    os.environ[key] = value
    except OSError:
        pass


class Settings(BaseSettings):
    OPENAI_API_KEY: str = Field(..., min_length=1)
    PINECONE_API_KEY: str = Field(..., min_length=1)
    PINECONE_INDEX: str = Field(..., min_length=1)
    PINECONE_NAMESPACE: str = Field(..., min_length=1)
    ALLOWED_ORIGINS: str = Field(..., min_length=1)

    OPENAI_MODEL: str = "gpt-5.1"
    OPENAI_EMBED_MODEL: str = "text-embedding-3-small"
    REDIS_URL: str | None = None
    ENV: str = "dev"
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(extra="ignore")

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    _load_env_file()
    return Settings()
