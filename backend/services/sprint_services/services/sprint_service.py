from __future__ import annotations

from typing import Any

from backend.infrastructure.shared.exceptions import ConflictError, ForbiddenError, NotFoundError
from backend.services.board_services.repository.board_repository import BoardRepository
from backend.services.sprint_services.repository.sprint_repository import SprintRepository


class SprintService:
    def __init__(self, sprint_repo: SprintRepository, board_repo: BoardRepository):
        self._repo = sprint_repo
        self._board_repo = board_repo

    async def _assert_owner(self, board_id: str, user_id: str) -> None:
        if not await self._board_repo.get_owned(board_id, user_id):
            raise ForbiddenError("Board bulunamadı veya yetkisiz")

    async def _get_or_404(self, sprint_id: str) -> dict[str, Any]:
        sprint = await self._repo.get(sprint_id)
        if not sprint:
            raise NotFoundError("Sprint bulunamadı")
        return sprint

    async def list_sprints(self, board_id: str, user_id: str) -> list[dict[str, Any]]:
        board = await self._board_repo.get_accessible(board_id, user_id)
        if not board:
            raise ForbiddenError("Board bulunamadı veya erişim reddedildi")
        return await self._repo.list_by_board(board_id)

    async def create_sprint(
        self,
        board_id: str,
        user_id: str,
        name: str,
        goal: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> dict[str, Any]:
        if not await self._board_repo.get_accessible(board_id, user_id):
            raise ForbiddenError("Board bulunamadı veya yetkisiz")
        return await self._repo.create(board_id, name, goal, start_date, end_date)

    async def _assert_accessible(self, board_id: str, user_id: str) -> None:
        if not await self._board_repo.get_accessible(board_id, user_id):
            raise ForbiddenError("Board bulunamadı veya yetkisiz")

    async def update_sprint(
        self, sprint_id: str, user_id: str, **fields: Any
    ) -> dict[str, Any]:
        sprint = await self._get_or_404(sprint_id)
        await self._assert_accessible(sprint["board_id"], user_id)
        cleaned = {k: v for k, v in fields.items() if v is not None}
        if not cleaned:
            return sprint
        return await self._repo.update(sprint_id, **cleaned)

    async def delete_sprint(self, sprint_id: str, user_id: str) -> None:
        sprint = await self._get_or_404(sprint_id)
        await self._assert_accessible(sprint["board_id"], user_id)
        await self._repo.delete(sprint_id)

    async def start_sprint(self, sprint_id: str, user_id: str) -> dict[str, Any]:
        sprint = await self._get_or_404(sprint_id)
        await self._assert_accessible(sprint["board_id"], user_id)
        if sprint["state"] != "future":
            raise ConflictError("Sadece 'future' durumundaki sprint başlatılabilir")
        existing = await self._repo.get_active_sprint(sprint["board_id"])
        if existing:
            raise ConflictError("Bu board'da zaten aktif bir sprint var")
        return await self._repo.set_state(sprint_id, "active")

    async def complete_sprint(self, sprint_id: str, user_id: str) -> dict[str, Any]:
        sprint = await self._get_or_404(sprint_id)
        await self._assert_accessible(sprint["board_id"], user_id)
        if sprint["state"] != "active":
            raise ConflictError("Sadece 'active' durumundaki sprint tamamlanabilir")
        return await self._repo.set_state(sprint_id, "completed")
