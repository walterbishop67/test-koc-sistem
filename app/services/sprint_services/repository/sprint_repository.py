from __future__ import annotations

import uuid
from typing import Any

from supabase import AsyncClient


class SprintRepository:
    def __init__(self, client: AsyncClient):
        self._sb = client

    async def create(
        self,
        board_id: str,
        name: str,
        goal: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "board_id": board_id,
            "name": name,
            "state": "future",
        }
        if goal is not None:
            payload["goal"] = goal
        if start_date is not None:
            payload["start_date"] = start_date
        if end_date is not None:
            payload["end_date"] = end_date

        res = await self._sb.table("sprints").insert(payload).execute()
        return res.data[0]

    async def list_by_board(self, board_id: str) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("sprints")
            .select("*")
            .eq("board_id", board_id)
            .order("created_at")
            .execute()
        )
        return res.data

    async def get(self, sprint_id: str) -> dict[str, Any] | None:
        res = (
            await self._sb.table("sprints")
            .select("*")
            .eq("id", sprint_id)
            .execute()
        )
        return res.data[0] if res.data else None

    async def update(self, sprint_id: str, **fields: Any) -> dict[str, Any]:
        res = (
            await self._sb.table("sprints")
            .update(fields)
            .eq("id", sprint_id)
            .execute()
        )
        return res.data[0]

    async def delete(self, sprint_id: str) -> None:
        await self._sb.table("sprints").delete().eq("id", sprint_id).execute()

    async def set_state(self, sprint_id: str, state: str) -> dict[str, Any]:
        res = (
            await self._sb.table("sprints")
            .update({"state": state})
            .eq("id", sprint_id)
            .execute()
        )
        return res.data[0]

    async def get_active_sprint(self, board_id: str) -> dict[str, Any] | None:
        res = (
            await self._sb.table("sprints")
            .select("id")
            .eq("board_id", board_id)
            .eq("state", "active")
            .execute()
        )
        return res.data[0] if res.data else None
