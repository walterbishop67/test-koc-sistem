from __future__ import annotations

import uuid
from typing import Any

from supabase import AsyncClient


class ProjectRepository:
    def __init__(self, client: AsyncClient):
        self._sb = client

    async def list_by_owner(self, user_id: str) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("projects")
            .select("*")
            .eq("owner_id", user_id)
            .order("created_at")
            .execute()
        )
        return res.data

    async def create(self, title: str, description: str, owner_id: str) -> dict[str, Any]:
        res = await self._sb.table("projects").insert({
            "id": str(uuid.uuid4()),
            "title": title,
            "description": description,
            "owner_id": owner_id,
        }).execute()
        return res.data[0]

    async def get_owned(self, project_id: str, user_id: str) -> dict[str, Any] | None:
        res = (
            await self._sb.table("projects")
            .select("id")
            .eq("id", project_id)
            .eq("owner_id", user_id)
            .execute()
        )
        return res.data[0] if res.data else None

    async def update(self, project_id: str, title: str, description: str) -> dict[str, Any]:
        res = (
            await self._sb.table("projects")
            .update({"title": title, "description": description})
            .eq("id", project_id)
            .execute()
        )
        return res.data[0]

    async def delete(self, project_id: str) -> None:
        await self._sb.table("projects").delete().eq("id", project_id).execute()

    async def list_boards(self, project_id: str) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("boards")
            .select("*")
            .eq("project_id", project_id)
            .eq("is_archived", False)
            .order("created_at")
            .execute()
        )
        return res.data
