from __future__ import annotations

from typing import Any

from backend.services.notification_services.services.notification_service import NotificationService


class NotificationController:
    def __init__(self, svc: NotificationService):
        self._svc = svc

    async def list(self, user_id: str) -> list[dict[str, Any]]:
        return await self._svc.list(user_id)

    async def mark_read(self, notification_id: str, user_id: str) -> None:
        await self._svc.mark_read(notification_id, user_id)

    async def mark_all_read(self, user_id: str) -> None:
        await self._svc.mark_all_read(user_id)
