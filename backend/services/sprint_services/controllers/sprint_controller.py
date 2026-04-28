from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from backend.infrastructure.shared.exceptions import ConflictError, ForbiddenError, NotFoundError
from backend.services.sprint_services.services.sprint_service import SprintService


class SprintController:
    def __init__(self, svc: SprintService):
        self._svc = svc

    async def list_sprints(self, board_id: str, user_id: str) -> list[dict[str, Any]]:
        try:
            return await self._svc.list_sprints(board_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def create_sprint(
        self,
        board_id: str,
        user_id: str,
        name: str,
        goal: str | None,
        start_date: str | None,
        end_date: str | None,
    ) -> dict[str, Any]:
        try:
            return await self._svc.create_sprint(board_id, user_id, name, goal, start_date, end_date)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def update_sprint(self, sprint_id: str, user_id: str, **fields: Any) -> dict[str, Any]:
        try:
            return await self._svc.update_sprint(sprint_id, user_id, **fields)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)
        except NotFoundError as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=exc.detail)

    async def delete_sprint(self, sprint_id: str, user_id: str) -> None:
        try:
            await self._svc.delete_sprint(sprint_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)
        except NotFoundError as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=exc.detail)

    async def start_sprint(self, sprint_id: str, user_id: str) -> dict[str, Any]:
        try:
            return await self._svc.start_sprint(sprint_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)
        except NotFoundError as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=exc.detail)
        except ConflictError as exc:
            raise HTTPException(status.HTTP_409_CONFLICT, detail=exc.detail)

    async def complete_sprint(self, sprint_id: str, user_id: str) -> dict[str, Any]:
        try:
            return await self._svc.complete_sprint(sprint_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)
        except NotFoundError as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=exc.detail)
        except ConflictError as exc:
            raise HTTPException(status.HTTP_409_CONFLICT, detail=exc.detail)
