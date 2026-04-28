from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from backend.infrastructure.shared.exceptions import ForbiddenError, NotFoundError
from backend.services.label_services.services.label_service import LabelService


class LabelController:
    def __init__(self, svc: LabelService):
        self._svc = svc

    async def list_labels(self, board_id: str, user_id: str) -> list[dict[str, Any]]:
        try:
            return await self._svc.list_labels(board_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def create_label(self, board_id: str, user_id: str, name: str, color: str) -> dict[str, Any]:
        try:
            return await self._svc.create_label(board_id, user_id, name, color)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def update_label(self, label_id: str, user_id: str, name: str | None, color: str | None) -> dict:
        try:
            return await self._svc.update_label(label_id, user_id, name, color)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)
        except NotFoundError as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=exc.detail)

    async def delete_label(self, label_id: str, user_id: str) -> None:
        try:
            await self._svc.delete_label(label_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)
        except NotFoundError as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=exc.detail)

    async def add_label_to_card(self, card_id: str, label_id: str, user_id: str) -> None:
        try:
            await self._svc.add_label_to_card(card_id, label_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)
        except NotFoundError as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=exc.detail)

    async def remove_label_from_card(self, card_id: str, label_id: str, user_id: str) -> None:
        try:
            await self._svc.remove_label_from_card(card_id, label_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)
        except NotFoundError as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=exc.detail)
