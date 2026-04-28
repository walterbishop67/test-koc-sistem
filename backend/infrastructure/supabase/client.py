"""Supabase async client lifecycle.

Mimari kural:
  - Client yalnızca lifespan içinde oluşturulur ve app.state'e yazılır.
  - Başka hiçbir yerde acreate_client çağrılmaz.
  - dependencies.py sadece app.state'den okur.
"""

from __future__ import annotations

from supabase import AsyncClient, acreate_client

from backend.config import Settings
from backend.infrastructure.shared.logger import get_logger

log = get_logger(__name__)

_client: AsyncClient | None = None


async def init_client(settings: Settings) -> AsyncClient:
    global _client
    _client = await acreate_client(settings.supabase_url, settings.supabase_anon_key)
    log.info("Supabase client oluşturuldu: %s", settings.supabase_url)
    return _client


def get_client() -> AsyncClient:
    if _client is None:
        raise RuntimeError("Supabase client henüz başlatılmadı")
    return _client


async def close_client() -> None:
    global _client
    if _client is not None:
        _client = None
        log.info("Supabase client kapatıldı")
