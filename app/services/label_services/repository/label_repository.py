from __future__ import annotations

from typing import Any

from supabase import AsyncClient


class LabelRepository:
    def __init__(self, client: AsyncClient):
        self._sb = client

    async def list_by_board(self, board_id: str) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("labels")
            .select("*")
            .eq("board_id", board_id)
            .order("created_at")
            .execute()
        )
        return res.data

    async def get(self, label_id: str) -> dict[str, Any] | None:
        res = (
            await self._sb.table("labels")
            .select("*")
            .eq("id", label_id)
            .execute()
        )
        return res.data[0] if res.data else None

    async def create(self, board_id: str, name: str, color: str) -> dict[str, Any]:
        res = (
            await self._sb.table("labels")
            .insert({"board_id": board_id, "name": name, "color": color})
            .execute()
        )
        return res.data[0]

    async def update(self, label_id: str, updates: dict) -> dict:
        res = await self._sb.table("labels").update(updates).eq("id", label_id).execute()
        return res.data[0]

    async def delete(self, label_id: str) -> None:
        await self._sb.table("labels").delete().eq("id", label_id).execute()

    async def has_board_access(self, board_id: str, user_id: str) -> bool:
        owned = (
            await self._sb.table("boards")
            .select("id")
            .eq("id", board_id)
            .eq("owner_id", user_id)
            .execute()
        )
        if owned.data:
            return True
        member = (
            await self._sb.table("board_members")
            .select("id")
            .eq("board_id", board_id)
            .eq("user_id", user_id)
            .eq("status", "accepted")
            .execute()
        )
        return bool(member.data)

    async def get_card_board_id(self, card_id: str) -> str | None:
        res = (
            await self._sb.table("cards")
            .select("columns!inner(board_id)")
            .eq("id", card_id)
            .execute()
        )
        if not res.data:
            return None
        return res.data[0]["columns"]["board_id"]

    async def add_label_to_card(self, card_id: str, label_id: str) -> None:
        await (
            self._sb.table("card_labels")
            .upsert({"card_id": card_id, "label_id": label_id})
            .execute()
        )

    async def remove_label_from_card(self, card_id: str, label_id: str) -> None:
        await (
            self._sb.table("card_labels")
            .delete()
            .eq("card_id", card_id)
            .eq("label_id", label_id)
            .execute()
        )
