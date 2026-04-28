from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from app.infrastructure.shared.exceptions import ForbiddenError
from app.services.team_services.services.team_service import TeamService


class TeamController:
    def __init__(self, svc: TeamService):
        self._svc = svc

    async def list_teams(self, user_id: str) -> list[dict[str, Any]]:
        return await self._svc.list_teams(user_id)

    async def create_team(self, name: str, user_id: str) -> dict[str, Any]:
        return await self._svc.create_team(name, user_id)

    async def delete_team(self, team_id: str, user_id: str) -> None:
        try:
            await self._svc.delete_team(team_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def list_members(self, team_id: str, user_id: str) -> list[dict[str, Any]]:
        try:
            return await self._svc.list_members(team_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def add_member(self, team_id: str, user_id: str, email: str) -> dict[str, Any]:
        try:
            return await self._svc.add_member(team_id, user_id, email)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def remove_member(self, team_id: str, member_id: str, user_id: str) -> None:
        try:
            await self._svc.remove_member(team_id, member_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def list_pending_invitations(self, email: str) -> list[dict[str, Any]]:
        return await self._svc.list_pending_invitations(email)

    async def accept_invitation(self, team_id: str, email: str, user_id: str) -> None:
        await self._svc.accept_invitation(team_id, email, user_id)

    async def decline_invitation(self, team_id: str, email: str) -> None:
        await self._svc.decline_invitation(team_id, email)
