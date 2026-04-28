from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from app.infrastructure.shared.exceptions import ForbiddenError
from app.services.column_services.services.column_service import ColumnService


class ColumnController:
    def __init__(self, svc: ColumnService):
        self._svc = svc

    async def list_columns(self, board_id: str, user_id: str) -> list[dict[str, Any]]:
        try:
            return await self._svc.list_columns(board_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def create_column(self, board_id: str, title: str, position: str, user_id: str) -> dict[str, Any]:
        try:
            return await self._svc.create_column(board_id, title, position, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def update_column(
        self, column_id: str, title: str | None, position: str | None, user_id: str
    ) -> dict[str, Any]:
        try:
            return await self._svc.update_column(column_id, title, position, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def delete_column(self, column_id: str, user_id: str) -> None:
        try:
            await self._svc.delete_column(column_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)
