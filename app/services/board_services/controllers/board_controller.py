from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from app.infrastructure.shared.exceptions import ForbiddenError
from app.services.board_services.services.board_service import BoardService


class BoardController:
    def __init__(self, svc: BoardService):
        self._svc = svc

    async def list_boards(self, user_id: str, email: str) -> list[dict[str, Any]]:
        return await self._svc.list_boards(user_id, email)

    async def create_board(
        self,
        title: str,
        user_id: str,
        initial_sprint: Any | None = None,
        team_id: str | None = None,
        ai_columns: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        return await self._svc.create_board(title, user_id, initial_sprint, team_id, ai_columns)

    async def update_board(self, board_id: str, title: str, user_id: str) -> dict[str, Any]:
        try:
            return await self._svc.update_board(board_id, title, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def delete_board(self, board_id: str, user_id: str) -> None:
        try:
            await self._svc.delete_board(board_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def archive_board(self, board_id: str, user_id: str) -> None:
        try:
            await self._svc.archive_board(board_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def unarchive_board(self, board_id: str, user_id: str) -> None:
        try:
            await self._svc.unarchive_board(board_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def list_archived_boards(self, user_id: str) -> list[dict]:
        return await self._svc.list_archived_boards(user_id)

    async def invite_member(self, board_id: str, user_id: str, email: str, role: str) -> dict[str, Any]:
        try:
            return await self._svc.invite_member(board_id, user_id, email, role)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def list_members(self, board_id: str, user_id: str) -> list[dict[str, Any]]:
        try:
            return await self._svc.list_members(board_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def remove_member(self, board_id: str, member_id: str, user_id: str) -> None:
        try:
            await self._svc.remove_member(board_id, member_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def list_pending_invitations(self, email: str) -> list[dict[str, Any]]:
        return await self._svc.list_pending_invitations(email)

    async def accept_invitation(self, board_id: str, email: str, user_id: str) -> None:
        await self._svc.accept_invitation(board_id, email, user_id)

    async def decline_invitation(self, board_id: str, email: str) -> None:
        await self._svc.decline_invitation(board_id, email)
