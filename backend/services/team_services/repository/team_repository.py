from __future__ import annotations

import uuid
from typing import Any

from supabase import AsyncClient


class TeamRepository:
    def __init__(self, client: AsyncClient):
        self._sb = client

    async def list_by_owner(self, user_id: str) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("teams")
            .select("*")
            .eq("owner_id", user_id)
            .order("created_at")
            .execute()
        )
        return res.data

    async def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        owned = await self.list_by_owner(user_id)

        memberships = (
            await self._sb.table("team_members")
            .select("team_id")
            .eq("user_id", user_id)
            .eq("status", "accepted")
            .execute()
        )
        member_team_ids = [m["team_id"] for m in (memberships.data or []) if m.get("team_id")]
        if not member_team_ids:
            return owned

        joined = (
            await self._sb.table("teams")
            .select("*")
            .in_("id", member_team_ids)
            .order("created_at")
            .execute()
        )

        dedup: dict[str, dict[str, Any]] = {t["id"]: t for t in owned}
        for t in joined.data or []:
            dedup[t["id"]] = t
        return sorted(dedup.values(), key=lambda t: t.get("created_at", ""))

    async def create(self, name: str, owner_id: str) -> dict[str, Any]:
        payload = {"id": str(uuid.uuid4()), "name": name, "owner_id": owner_id}
        res = await self._sb.table("teams").insert(payload).execute()
        return res.data[0]

    async def get_owned(self, team_id: str, user_id: str) -> dict[str, Any] | None:
        res = (
            await self._sb.table("teams")
            .select("id")
            .eq("id", team_id)
            .eq("owner_id", user_id)
            .execute()
        )
        return res.data[0] if res.data else None

    async def can_access(self, team_id: str, user_id: str) -> bool:
        owned = await self.get_owned(team_id, user_id)
        if owned:
            return True

        membership = (
            await self._sb.table("team_members")
            .select("id")
            .eq("team_id", team_id)
            .eq("user_id", user_id)
            .eq("status", "accepted")
            .limit(1)
            .execute()
        )
        return bool(membership.data)

    async def get_team(self, team_id: str) -> dict[str, Any] | None:
        res = (
            await self._sb.table("teams")
            .select("*")
            .eq("id", team_id)
            .execute()
        )
        return res.data[0] if res.data else None

    async def delete(self, team_id: str) -> None:
        await self._sb.table("teams").delete().eq("id", team_id).execute()

    async def list_members(self, team_id: str) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("team_members")
            .select("*")
            .eq("team_id", team_id)
            .order("created_at")
            .execute()
        )
        return res.data

    async def add_member(self, team_id: str, email: str) -> dict[str, Any]:
        payload = {
            "id": str(uuid.uuid4()),
            "team_id": team_id,
            "email": email,
            "status": "pending",
        }
        res = (
            await self._sb.table("team_members")
            .upsert(payload, on_conflict="team_id,email")
            .execute()
        )
        return res.data[0]

    async def remove_member(self, team_id: str, member_id: str) -> None:
        await (
            self._sb.table("team_members")
            .delete()
            .eq("id", member_id)
            .eq("team_id", team_id)
            .execute()
        )

    async def list_pending_invitations(self, email: str) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("team_members")
            .select("*, teams(id, name, owner_id)")
            .eq("email", email)
            .eq("status", "pending")
            .order("created_at", desc=True)
            .execute()
        )
        return res.data

    async def accept_invitation(self, team_id: str, email: str, user_id: str) -> None:
        await (
            self._sb.table("team_members")
            .update({"status": "accepted", "user_id": user_id})
            .eq("team_id", team_id)
            .eq("email", email)
            .eq("status", "pending")
            .execute()
        )

    async def decline_invitation(self, team_id: str, email: str) -> None:
        await (
            self._sb.table("team_members")
            .delete()
            .eq("team_id", team_id)
            .eq("email", email)
            .execute()
        )
