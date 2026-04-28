from __future__ import annotations

import uuid
from typing import Any

from supabase import AsyncClient


class NotificationRepository:
    def __init__(self, client: AsyncClient):
        self._sb = client

    async def create(
        self,
        user_id: str,
        type: str,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": type,
            "title": title,
            "body": body,
            "data": data or {},
        }
        res = await self._sb.table("notifications").insert(payload).execute()
        return res.data[0]

    async def list_for_user(self, user_id: str, limit: int = 30) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("notifications")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data

    async def mark_read(self, notification_id: str, user_id: str) -> None:
        await (
            self._sb.table("notifications")
            .update({"is_read": True})
            .eq("id", notification_id)
            .eq("user_id", user_id)
            .execute()
        )

    async def mark_all_read(self, user_id: str) -> None:
        await (
            self._sb.table("notifications")
            .update({"is_read": True})
            .eq("user_id", user_id)
            .eq("is_read", False)
            .execute()
        )

    async def find_user_id_by_email(self, email: str) -> str | None:
        res = (
            await self._sb.table("users")
            .select("id")
            .eq("email", email)
            .execute()
        )
        return res.data[0]["id"] if res.data else None

    async def find_user_email_by_id(self, user_id: str) -> str | None:
        res = (
            await self._sb.table("users")
            .select("email")
            .eq("id", user_id)
            .execute()
        )
        return res.data[0]["email"] if res.data else None
