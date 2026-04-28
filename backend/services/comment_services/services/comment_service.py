from __future__ import annotations

from typing import Any

from backend.infrastructure.shared.exceptions import ForbiddenError, NotFoundError
from backend.services.comment_services.repository.comment_repository import CommentRepository


class CommentService:
    def __init__(self, repo: CommentRepository):
        self._repo = repo

    async def list_comments(self, card_id: str, user_id: str) -> list[dict[str, Any]]:
        if not await self._repo.has_card_access(card_id, user_id):
            raise ForbiddenError("Card not found")
        return await self._repo.list_by_card(card_id)

    async def create_comment(self, card_id: str, user_id: str, content: str) -> dict[str, Any]:
        if not await self._repo.has_card_access(card_id, user_id):
            raise ForbiddenError("Card not found")
        return await self._repo.create(card_id, user_id, content)

    async def delete_comment(self, comment_id: str, user_id: str) -> None:
        comment = await self._repo.get(comment_id)
        if comment is None:
            raise NotFoundError("Comment not found")
        if comment["user_id"] != user_id:
            raise ForbiddenError("Sadece kendi yorumunuzu silebilirsiniz")
        await self._repo.delete(comment_id)
