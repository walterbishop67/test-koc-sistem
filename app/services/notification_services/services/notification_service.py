from __future__ import annotations

from typing import Any

from app.services.notification_services.repository.notification_repository import NotificationRepository


class NotificationService:
    def __init__(self, repo: NotificationRepository):
        self._repo = repo

    async def list(self, user_id: str) -> list[dict[str, Any]]:
        return await self._repo.list_for_user(user_id)

    async def mark_read(self, notification_id: str, user_id: str) -> None:
        await self._repo.mark_read(notification_id, user_id)

    async def mark_all_read(self, user_id: str) -> None:
        await self._repo.mark_all_read(user_id)
