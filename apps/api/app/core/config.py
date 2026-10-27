"""
TraceGuard API — Application Settings
Uses pydantic-settings for typed, validated environment config.
Falls back to SQLite for local dev/test when DATABASE_URL is not set.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database — defaults to SQLite for pytest / local dev without Docker
    database_url: str = "sqlite+aiosqlite:///./traceguard_dev.db"

    # Security
    secret_key: str = "dev-secret-key-change-in-production-min-32-chars!!"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    # CORS
    allowed_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # Logging
    log_level: str = "info"

    # App metadata
    app_name: str = "TraceGuard API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
