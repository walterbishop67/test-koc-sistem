from __future__ import annotations

from typing import Any

from app.infrastructure.shared.exceptions import ForbiddenError
from app.services.card_services.repository.activity_repository import ActivityRepository
from app.services.card_services.repository.card_repository import CardRepository
from app.services.card_services.schemas.card_schemas import CardUpdate


class CardService:
    def __init__(self, repo: CardRepository, activity_repo: ActivityRepository | None = None):
        self._repo = repo
        self._activity_repo = activity_repo

    async def _assert_column_access(self, column_id: str, user_id: str) -> None:
        if not await self._repo.has_column_access(column_id, user_id):
            raise ForbiddenError("Column not found")

    async def _assert_card_access(self, card_id: str, user_id: str) -> None:
        if not await self._repo.has_card_access(card_id, user_id):
            raise ForbiddenError("Card not found")

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
        await self._assert_column_access(column_id, user_id)
        card = await self._repo.create(column_id, title, description, position, priority, assignee_email)
        if self._activity_repo:
            col_title = await self._repo.get_column_title(column_id)
            await self._activity_repo.log(card["id"], user_id, "created", to_col=col_title)
        return card

    async def update_card(
        self, card_id: str, body: CardUpdate, user_id: str
    ) -> dict[str, Any]:
        await self._assert_card_access(card_id, user_id)
        updates: dict[str, Any] = body.model_dump(include=body.model_fields_set)
        if not updates:
            from fastapi import HTTPException
            raise HTTPException(400, "Nothing to update")

        new_col_id = updates.get("column_id")
        new_priority = updates.get("priority")

        if self._activity_repo and (new_col_id or new_priority is not None):
            old_col_id = await self._repo.get_card_column_id(card_id)
            old_priority = await self._repo.get_card_priority(card_id)

            result = await self._repo.update(card_id, updates)

            if new_col_id and old_col_id and old_col_id != new_col_id:
                from_title = await self._repo.get_column_title(old_col_id)
                to_title = await self._repo.get_column_title(new_col_id)
                await self._activity_repo.log(card_id, user_id, "moved", from_col=from_title, to_col=to_title)

            if new_priority is not None and new_priority != old_priority:
                await self._activity_repo.log(
                    card_id, user_id, "priority_changed",
                    from_priority=old_priority,
                    to_priority=new_priority,
                )

            return result

        return await self._repo.update(card_id, updates)

    async def delete_card(self, card_id: str, user_id: str) -> None:
        await self._assert_card_access(card_id, user_id)
        await self._repo.delete(card_id)

    async def list_activity(self, card_id: str, user_id: str) -> list[dict]:
        await self._assert_card_access(card_id, user_id)
        if self._activity_repo is None:
            return []
        return await self._activity_repo.list_for_card(card_id)
