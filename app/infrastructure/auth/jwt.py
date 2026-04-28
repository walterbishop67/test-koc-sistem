"""Supabase bearer token dogrulama — GreenHouse pattern."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import httpx

from app.config import Settings


@dataclass
class AuthenticatedUser:
    id: str
    email: Optional[str] = None
    provider: Optional[str] = None


async def fetch_supabase_user(token: str, settings: Settings) -> dict[str, Any]:
    headers = {
        "apikey": settings.supabase_anon_key,
        "Authorization": f"Bearer {token}",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers=headers,
        )
    if response.status_code != 200:
        raise RuntimeError("Supabase kullanici dogrulamasi basarisiz.")
    return response.json()
