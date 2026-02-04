from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
