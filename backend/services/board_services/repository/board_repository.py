from __future__ import annotations

import uuid
from typing import Any

from supabase import AsyncClient


class BoardRepository:
    def __init__(self, client: AsyncClient):
        self._sb = client

    # ── Team inference ────────────────────────────────────────────────────────
    async def _attach_team_names(self, boards: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Attach team_names to each board via board_members ↔ team_members email overlap."""
        if not boards:
            return boards

        board_ids = [b["id"] for b in boards]

        bm_res = (
            await self._sb.table("board_members")
            .select("board_id, invited_email")
            .in_("board_id", board_ids)
            .execute()
        )
        tm_res = (
            await self._sb.table("team_members")
            .select("email, teams(name)")
            .execute()
        )

        # email → set of team names
        email_to_teams: dict[str, set[str]] = {}
        for tm in tm_res.data:
            team = tm.get("teams")
            email = tm.get("email")
            if isinstance(team, dict) and team.get("name") and email:
                email_to_teams.setdefault(email, set()).add(team["name"])

        # board_id → set of team names
        board_to_teams: dict[str, set[str]] = {}
        for bm in bm_res.data:
            email = bm.get("invited_email")
            board_id = bm.get("board_id")
            if email and board_id and email in email_to_teams:
                board_to_teams.setdefault(board_id, set()).update(email_to_teams[email])

        for board in boards:
            board["team_names"] = sorted(board_to_teams.get(board["id"], []))

        return boards

    # ── CRUD ──────────────────────────────────────────────────────────────────

    async def list_by_owner(self, user_id: str) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("boards")
            .select("*")
            .eq("owner_id", user_id)
            .order("created_at")
            .execute()
        )
        return await self._attach_team_names(res.data)

    async def create(self, title: str, owner_id: str, team_id: str | None = None, project_id: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "title": title,
            "owner_id": owner_id,
        }
        if team_id:
            payload["team_id"] = team_id
        if project_id:
            payload["project_id"] = project_id
        res = await self._sb.table("boards").insert(payload).execute()
        board = res.data[0]
        board["team_names"] = []
        return board

    async def get_owned(self, board_id: str, user_id: str) -> dict[str, Any] | None:
        res = (
            await self._sb.table("boards")
            .select("id")
            .eq("id", board_id)
            .eq("owner_id", user_id)
            .execute()
        )
        return res.data[0] if res.data else None

    async def update(self, board_id: str, title: str) -> dict[str, Any]:
        res = await self._sb.table("boards").update({"title": title}).eq("id", board_id).execute()
        return res.data[0]

    async def delete(self, board_id: str) -> None:
        await self._sb.table("boards").delete().eq("id", board_id).execute()

    async def list_accessible(self, user_id: str) -> list[dict[str, Any]]:
        owned = (
            await self._sb.table("boards")
            .select("*")
            .eq("owner_id", user_id)
            .eq("is_archived", False)
            .order("created_at")
            .execute()
        ).data
        memberships = (
            await self._sb.table("board_members")
            .select("board_id")
            .eq("user_id", user_id)
            .eq("status", "accepted")
            .execute()
        ).data
        member_ids = [m["board_id"] for m in memberships]
        if member_ids:
            member_boards = (
                await self._sb.table("boards")
                .select("*")
                .in_("id", member_ids)
                .eq("is_archived", False)
                .order("created_at")
                .execute()
            ).data
        else:
            member_boards = []
        seen = {b["id"] for b in owned}
        all_boards = owned + [b for b in member_boards if b["id"] not in seen]
        return await self._attach_team_names(all_boards)

    async def list_archived(self, user_id: str) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("boards")
            .select("*")
            .eq("owner_id", user_id)
            .eq("is_archived", True)
            .order("created_at", desc=True)
            .execute()
        )
        return await self._attach_team_names(res.data)

    async def set_archived(self, board_id: str, is_archived: bool) -> None:
        await self._sb.table("boards").update({"is_archived": is_archived}).eq("id", board_id).execute()

    async def accept_pending_invitations(self, user_id: str, email: str) -> None:
        await (
            self._sb.table("board_members")
            .update({"user_id": user_id, "status": "accepted"})
            .eq("invited_email", email)
            .eq("status", "pending")
            .execute()
        )

    async def get_accessible(self, board_id: str, user_id: str) -> dict[str, Any] | None:
        owned = (
            await self._sb.table("boards")
            .select("id")
            .eq("id", board_id)
            .eq("owner_id", user_id)
            .execute()
        ).data
        if owned:
            return owned[0]
        member = (
            await self._sb.table("board_members")
            .select("id")
            .eq("board_id", board_id)
            .eq("user_id", user_id)
            .eq("status", "accepted")
            .execute()
        ).data
        return member[0] if member else None

    async def invite_member(self, board_id: str, email: str, role: str = "member") -> dict[str, Any]:
        res = await (
            self._sb.table("board_members")
            .upsert(
                {"board_id": board_id, "invited_email": email, "role": role},
                on_conflict="board_id,invited_email",
            )
            .execute()
        )
        return res.data[0]

    async def list_members(self, board_id: str) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("board_members")
            .select("*")
            .eq("board_id", board_id)
            .order("created_at")
            .execute()
        )
        return res.data

    async def remove_member(self, board_id: str, member_id: str) -> None:
        await (
            self._sb.table("board_members")
            .delete()
            .eq("id", member_id)
            .eq("board_id", board_id)
            .execute()
        )

    async def get_board(self, board_id: str) -> dict[str, Any] | None:
        res = (
            await self._sb.table("boards")
            .select("*")
            .eq("id", board_id)
            .execute()
        )
        return res.data[0] if res.data else None

    async def list_pending_invitations(self, email: str) -> list[dict[str, Any]]:
        res = (
            await self._sb.table("board_members")
            .select("*, boards(id, title, owner_id)")
            .eq("invited_email", email)
            .eq("status", "pending")
            .order("created_at", desc=True)
            .execute()
        )
        return res.data

    async def accept_invitation(self, board_id: str, email: str, user_id: str) -> None:
        await (
            self._sb.table("board_members")
            .update({"status": "accepted", "user_id": user_id})
            .eq("board_id", board_id)
            .eq("invited_email", email)
            .eq("status", "pending")
            .execute()
        )

    async def decline_invitation(self, board_id: str, email: str) -> None:
        await (
            self._sb.table("board_members")
            .delete()
            .eq("board_id", board_id)
            .eq("invited_email", email)
            .execute()
        )
