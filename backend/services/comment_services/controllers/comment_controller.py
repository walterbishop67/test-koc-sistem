from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from backend.infrastructure.shared.exceptions import ForbiddenError, NotFoundError
from backend.services.comment_services.services.comment_service import CommentService


class CommentController:
    def __init__(self, svc: CommentService):
        self._svc = svc

    async def list_comments(self, card_id: str, user_id: str) -> list[dict[str, Any]]:
        try:
            return await self._svc.list_comments(card_id, user_id)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def create_comment(self, card_id: str, user_id: str, content: str) -> dict[str, Any]:
        try:
            return await self._svc.create_comment(card_id, user_id, content)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)

    async def delete_comment(self, comment_id: str, user_id: str) -> None:
        try:
            await self._svc.delete_comment(comment_id, user_id)
        except NotFoundError as exc:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=exc.detail)
        except ForbiddenError as exc:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail=exc.detail)
