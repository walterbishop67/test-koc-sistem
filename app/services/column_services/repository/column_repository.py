from __future__ import annotations

from typing import Any

from supabase import AsyncClient


class ColumnRepository:
    def __init__(self, client: AsyncClient):
        self._sb = client

    async def list_by_board(self, board_id: str) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("columns")
            .select("*, cards(*, card_labels(labels(*)))")
            .eq("board_id", board_id)
            .order("position")
            .execute()
        )
        for col in res.data:
            for card in col.get("cards") or []:
                card["labels"] = [
                    cl["labels"]
                    for cl in card.pop("card_labels", None) or []
                    if cl.get("labels")
                ]
            col["cards"] = sorted(col.get("cards") or [], key=lambda c: c["position"])
        return res.data

    async def create(self, board_id: str, title: str, position: str) -> dict[str, Any]:
        res = (
            await self._sb.table("columns")
            .insert({"board_id": board_id, "title": title, "position": position})
            .execute()
        )
        result = res.data[0]
        result["cards"] = []
        return result

    async def get_with_board_owner(self, column_id: str) -> dict[str, Any] | None:
        res = (
            await self._sb.table("columns")
            .select("id, boards!inner(owner_id)")
            .eq("id", column_id)
            .execute()
        )
        return res.data[0] if res.data else None

    async def update(self, column_id: str, updates: dict[str, Any]) -> dict[str, Any]:
        res = await self._sb.table("columns").update(updates).eq("id", column_id).execute()
        return res.data[0]

    async def delete(self, column_id: str) -> None:
        await self._sb.table("columns").delete().eq("id", column_id).execute()
