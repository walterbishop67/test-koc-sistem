from __future__ import annotations

from typing import Any

from supabase import AsyncClient


class ActivityRepository:
    def __init__(self, client: AsyncClient):
        self._sb = client

    async def log(
        self,
        card_id: str,
        user_id: str,
        action: str,
        from_col: str | None = None,
        to_col: str | None = None,
        from_priority: str | None = None,
        to_priority: str | None = None,
    ) -> None:
        payload: dict[str, Any] = {
            "card_id": card_id,
            "user_id": user_id,
            "action": action,
        }
        if from_col is not None:
            payload["from_col"] = from_col
        if to_col is not None:
            payload["to_col"] = to_col
        if from_priority is not None:
            payload["from_priority"] = from_priority
        if to_priority is not None:
            payload["to_priority"] = to_priority
        await self._sb.table("card_activities").insert(payload).execute()

    async def list_for_card(self, card_id: str) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("card_activities")
            .select("*, users(full_name, email)")
            .eq("card_id", card_id)
            .order("created_at", desc=True)
            .execute()
        )
        rows = []
        for row in res.data:
            user = row.pop("users", None) or {}
            row["user_name"] = user.get("full_name") or user.get("email")
            rows.append(row)
        return rows
