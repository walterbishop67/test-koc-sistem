from __future__ import annotations

from typing import Any

from supabase import AsyncClient


class CardRepository:
    def __init__(self, client: AsyncClient):
        self._sb = client

    async def get_column_owner(self, column_id: str) -> dict[str, Any] | None:
        res = (
            await self._sb.table("columns")
            .select("id, boards!inner(id, owner_id)")
            .eq("id", column_id)
            .execute()
        )
        return res.data[0] if res.data else None

    async def has_column_access(self, column_id: str, user_id: str) -> bool:
        res = (
            await self._sb.table("columns")
            .select("id, boards!inner(id, owner_id)")
            .eq("id", column_id)
            .execute()
        )
        if not res.data:
            return False
        board = res.data[0]["boards"]
        if board["owner_id"] == user_id:
            return True
        member = (
            await self._sb.table("board_members")
            .select("id")
            .eq("board_id", board["id"])
            .eq("user_id", user_id)
            .eq("status", "accepted")
            .execute()
        )
        return bool(member.data)

    async def has_card_access(self, card_id: str, user_id: str) -> bool:
        res = (
            await self._sb.table("cards")
            .select("id, columns!inner(boards!inner(id, owner_id))")
            .eq("id", card_id)
            .execute()
        )
        if not res.data:
            return False
        board = res.data[0]["columns"]["boards"]
        if board["owner_id"] == user_id:
            return True
        member = (
            await self._sb.table("board_members")
            .select("id")
            .eq("board_id", board["id"])
            .eq("user_id", user_id)
            .eq("status", "accepted")
            .execute()
        )
        return bool(member.data)

    async def create(
        self,
        column_id: str,
        title: str,
        description: str,
        position: str,
        priority: str | None = None,
        assignee_email: str | None = None,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "column_id": column_id,
            "title": title,
            "description": description,
            "position": position,
        }
        if priority is not None:
            payload["priority"] = priority
        if assignee_email is not None:
            payload["assignee_email"] = assignee_email
        res = await self._sb.table("cards").insert(payload).execute()
        return res.data[0]

    async def update(self, card_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        res = await self._sb.table("cards").update(updates).eq("id", card_id).execute()
        return res.data[0]

    async def delete(self, card_id: str) -> None:
        await self._sb.table("cards").delete().eq("id", card_id).execute()

    async def get_column_title(self, column_id: str) -> str | None:
        res = await self._sb.table("columns").select("title").eq("id", column_id).execute()
        return res.data[0]["title"] if res.data else None

    async def get_card_column_id(self, card_id: str) -> str | None:
        res = await self._sb.table("cards").select("column_id").eq("id", card_id).execute()
        return res.data[0]["column_id"] if res.data else None

    async def get_card_priority(self, card_id: str) -> str | None:
        res = await self._sb.table("cards").select("priority").eq("id", card_id).execute()
        return res.data[0].get("priority") if res.data else None
