from __future__ import annotations

from typing import Any

from supabase import AsyncClient


class CommentRepository:
    def __init__(self, client: AsyncClient):
        self._sb = client

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

    async def list_by_card(self, card_id: str) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("card_comments")
            .select("id, card_id, user_id, content, created_at, users!inner(full_name, email)")
            .eq("card_id", card_id)
            .order("created_at", desc=False)
            .execute()
        )
        return res.data

    async def create(self, card_id: str, user_id: str, content: str) -> dict[str, Any]:
        res = (
            await self._sb.table("card_comments")
            .insert({"card_id": card_id, "user_id": user_id, "content": content})
            .execute()
        )
        comment_id = res.data[0]["id"]
        detail = (
            await self._sb.table("card_comments")
            .select("id, card_id, user_id, content, created_at, users!inner(full_name, email)")
            .eq("id", comment_id)
            .single()
            .execute()
        )
        return detail.data

    async def get(self, comment_id: str) -> dict[str, Any] | None:
        res = (
            await self._sb.table("card_comments")
            .select("id, user_id")
            .eq("id", comment_id)
            .execute()
        )
        return res.data[0] if res.data else None

    async def delete(self, comment_id: str) -> None:
        await self._sb.table("card_comments").delete().eq("id", comment_id).execute()
