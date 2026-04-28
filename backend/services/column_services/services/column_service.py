from __future__ import annotations

from typing import Any

from backend.infrastructure.shared.exceptions import ForbiddenError
from backend.services.board_services.repository.board_repository import BoardRepository
from backend.services.column_services.repository.column_repository import ColumnRepository


class ColumnService:
    def __init__(self, col_repo: ColumnRepository, board_repo: BoardRepository):
        self._col_repo = col_repo
        self._board_repo = board_repo

    async def _assert_board_accessible(self, board_id: str, user_id: str) -> None:
        board = await self._board_repo.get_accessible(board_id, user_id)
        if not board:
            raise ForbiddenError("Board not found or not accessible")

    async def _assert_column_owner(self, column_id: str, user_id: str) -> None:
        col = await self._col_repo.get_with_board_owner(column_id)
        if not col or col["boards"]["owner_id"] != user_id:
            raise ForbiddenError("Column not found")

    async def list_columns(self, board_id: str, user_id: str) -> list[dict[str, Any]]:
        await self._assert_board_accessible(board_id, user_id)
        return await self._col_repo.list_by_board(board_id)

    async def create_column(self, board_id: str, title: str, position: str, user_id: str) -> dict[str, Any]:
        await self._assert_board_accessible(board_id, user_id)
        return await self._col_repo.create(board_id, title, position)

    async def update_column(
        self, column_id: str, title: str | None, position: str | None, user_id: str
    ) -> dict[str, Any]:
        await self._assert_column_owner(column_id, user_id)
        updates: dict[str, Any] = {}
        if title is not None:
            updates["title"] = title
        if position is not None:
            updates["position"] = position
        if not updates:
            from fastapi import HTTPException
            raise HTTPException(400, "Nothing to update")
        return await self._col_repo.update(column_id, updates)

    async def delete_column(self, column_id: str, user_id: str) -> None:
        await self._assert_column_owner(column_id, user_id)
        await self._col_repo.delete(column_id)
