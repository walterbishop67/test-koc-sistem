from __future__ import annotations

from typing import Any

from app.infrastructure.shared.exceptions import ForbiddenError, NotFoundError
from app.services.label_services.repository.label_repository import LabelRepository


class LabelService:
    def __init__(self, repo: LabelRepository):
        self._repo = repo

    async def _assert_board_access(self, board_id: str, user_id: str) -> None:
        if not await self._repo.has_board_access(board_id, user_id):
            raise ForbiddenError("Board bulunamadı veya yetkisiz")

    async def list_labels(self, board_id: str, user_id: str) -> list[dict[str, Any]]:
        await self._assert_board_access(board_id, user_id)
        return await self._repo.list_by_board(board_id)

    async def create_label(self, board_id: str, user_id: str, name: str, color: str) -> dict[str, Any]:
        await self._assert_board_access(board_id, user_id)
        return await self._repo.create(board_id, name.strip(), color)

    async def update_label(self, label_id: str, user_id: str, name: str | None, color: str | None) -> dict:
        label = await self._repo.get(label_id)
        if not label:
            raise NotFoundError("Etiket bulunamadı")
        await self._assert_board_access(label["board_id"], user_id)
        updates = {}
        if name is not None:
            updates["name"] = name.strip()
        if color is not None:
            updates["color"] = color
        return await self._repo.update(label_id, updates)

    async def delete_label(self, label_id: str, user_id: str) -> None:
        label = await self._repo.get(label_id)
        if not label:
            raise NotFoundError("Etiket bulunamadı")
        await self._assert_board_access(label["board_id"], user_id)
        await self._repo.delete(label_id)

    async def add_label_to_card(self, card_id: str, label_id: str, user_id: str) -> None:
        label = await self._repo.get(label_id)
        if not label:
            raise NotFoundError("Etiket bulunamadı")
        board_id = await self._repo.get_card_board_id(card_id)
        if not board_id:
            raise NotFoundError("Kart bulunamadı")
        if label["board_id"] != board_id:
            raise ForbiddenError("Etiket bu board'a ait değil")
        await self._assert_board_access(board_id, user_id)
        await self._repo.add_label_to_card(card_id, label_id)

    async def remove_label_from_card(self, card_id: str, label_id: str, user_id: str) -> None:
        board_id = await self._repo.get_card_board_id(card_id)
        if not board_id:
            raise NotFoundError("Kart bulunamadı")
        await self._assert_board_access(board_id, user_id)
        await self._repo.remove_label_from_card(card_id, label_id)
