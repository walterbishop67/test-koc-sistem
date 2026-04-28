from __future__ import annotations

from fastapi import HTTPException, status
from supabase import AsyncClient

from backend.infrastructure.shared.logger import get_logger

log = get_logger(__name__)


class AuthService:
    def __init__(self, client: AsyncClient):
        self._sb = client

    async def login(self, email: str, password: str) -> str:
        try:
            res = await self._sb.auth.sign_in_with_password({"email": email, "password": password})
        except Exception as exc:
            log.warning("Login başarısız: %s", exc)
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=str(exc))
        if not res.session:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Geçersiz e-posta veya şifre")
        return res.session.access_token

    async def signup(self, email: str, password: str, full_name: str) -> None:
        try:
            res = await self._sb.auth.sign_up({
                "email": email,
                "password": password,
                "options": {"data": {"full_name": full_name}},
            })
        except Exception as exc:
            msg = str(exc)
            if "already registered" in msg or "already been registered" in msg:
                raise HTTPException(status.HTTP_409_CONFLICT, detail="Bu e-posta adresiyle zaten bir hesap mevcut.")
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=msg)
        if res.user is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Kayıt başarısız")
