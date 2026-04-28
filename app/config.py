from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    supabase_url: str
    supabase_anon_key: str
    supabase_jwt_secret: str
    # Supabase Dashboard → Project Settings → Database → Connection string (URI)
    # Yoksa migration'lar atlanır, uygulama çalışmaya devam eder.
    supabase_db_url: Optional[str] = None
    # Supabase Dashboard → Project Settings → API → service_role (secret) key
    # Tanımlıysa davet emaili admin API üzerinden gönderilir.
    supabase_service_role_key: Optional[str] = None
    openai_api_key: Optional[str] = None

    app_title: str = "TaskFlow API"
    app_version: str = "1.0.0"
    log_level: str = "INFO"

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
