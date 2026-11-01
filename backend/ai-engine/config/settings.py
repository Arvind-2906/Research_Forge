"""ResearchForge AI Engine - Settings & Configuration.

Loads environment variables with Pydantic validation.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379"

    # Inter-Service Communication
    NODE_BACKEND_URL: str = "http://localhost:5000"
    INTERNAL_SERVICE_SECRET: str = "rf_internal_sec_9a2b4c6d8e0f123456789abcdef01234"

    # LLM & Embedding Models
    GROQ_API_KEY: str = ""
    PRIMARY_REASONING_MODEL: str = "openai/gpt-oss-120b"
    LIGHTWEIGHT_TASK_MODEL: str = "openai/gpt-oss-20b"
    HUGGINGFACE_API_KEY: str = ""
    HF_TOKEN: str = ""
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIMENSION: int = 384
    EMBEDDING_BATCH_SIZE: int = 32
    DEFAULT_LLM_TEMPERATURE: float = 0.2
    DEFAULT_LLM_MAX_RETRIES: int = 3
    DEFAULT_LLM_TIMEOUT: float = 60.0

    # Search & Tool APIs
    TAVILY_API_KEY: str = ""
    EXA_API_KEY: str = ""
    FIRECRAWL_API_KEY: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    @property
    def hf_api_token(self) -> str:
        return self.HF_TOKEN or self.HUGGINGFACE_API_KEY

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
