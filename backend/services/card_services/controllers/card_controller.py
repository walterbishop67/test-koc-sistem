from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from backend.infrastructure.shared.exceptions import ForbiddenError
from backend.services.card_services.schemas.card_schemas import CardUpdate
from backend.services.card_services.services.card_service import CardService


class CardController:
    def __init__(self, svc: CardService):
        self._svc = svc

    async def create_card(
        self,
        column_id: str,
        title: str,
        description: str,
        position: str,
        user_id: str,
        priority: str | None = None,
        assignee_email: str | None = None,
    ) -> dict[str, Any]:
        try:
            return await self._svc.create_card(
                column_id, title, description, position, user_id, priority, assignee_email
            )
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def update_card(
        self, card_id: str, body: CardUpdate, user_id: str
    ) -> dict[str, Any]:
        try:
            return await self._svc.update_card(card_id, body, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def delete_card(self, card_id: str, user_id: str) -> None:
        try:
            await self._svc.delete_card(card_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def list_activity(self, card_id: str, user_id: str) -> list[dict[str, Any]]:
        try:
            return await self._svc.list_activity(card_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)
