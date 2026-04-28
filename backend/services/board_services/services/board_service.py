from __future__ import annotations

from typing import TYPE_CHECKING, Any

from backend.infrastructure.shared.exceptions import ForbiddenError
from backend.infrastructure.shared.logger import get_logger
from backend.services.board_services.repository.board_repository import BoardRepository
from backend.services.column_services.repository.column_repository import ColumnRepository

if TYPE_CHECKING:
    from backend.services.card_services.repository.card_repository import CardRepository
    from backend.services.notification_services.repository.notification_repository import NotificationRepository
    from backend.services.sprint_services.repository.sprint_repository import SprintRepository

log = get_logger(__name__)


class BoardService:
    def __init__(
        self,
        repo: BoardRepository,
        col_repo: ColumnRepository,
        notif_repo: "NotificationRepository | None" = None,
        admin_sb: Any = None,
        sprint_repo: "SprintRepository | None" = None,
        card_repo: "CardRepository | None" = None,
    ):
        self._repo = repo
        self._col_repo = col_repo
        self._notif_repo = notif_repo
        self._admin_sb = admin_sb
        self._sprint_repo = sprint_repo
        self._card_repo = card_repo

    async def _assert_owner(self, board_id: str, user_id: str) -> None:
        board = await self._repo.get_owned(board_id, user_id)
        if not board:
            raise ForbiddenError("Board not found or not owner")

    async def _assert_access(self, board_id: str, user_id: str) -> None:
        board = await self._repo.get_accessible(board_id, user_id)
        if not board:
            raise ForbiddenError("Board not found or access denied")

    # ── Boards ────────────────────────────────────────────────────────────────

    async def list_boards(self, user_id: str, email: str) -> list[dict[str, Any]]:  # noqa: ARG002
        return await self._repo.list_accessible(user_id)

    async def create_board(
        self,
        title: str,
        user_id: str,
        initial_sprint: Any | None = None,
        team_id: str | None = None,
        ai_columns: list[dict[str, Any]] | None = None,
        project_id: str | None = None,
    ) -> dict[str, Any]:
        board = await self._repo.create(title, user_id, team_id, project_id)
        board_id = board["id"]
        # BASE-62 digits matching the fractional-indexing library on the frontend.
        # Valid single-digit keys: 'a' + BASE_62[i] → 'a0', 'a1', ..., 'az'
        _BASE_62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
        if ai_columns:
            for i, column_data in enumerate(ai_columns):
                col_position = f"a{_BASE_62[i % 62]}"
                created_col = await self._col_repo.create(board_id, column_data.get("name", "Untitled"), col_position)
                tasks = column_data.get("tasks") or []
                if tasks and self._card_repo:
                    for j, task_data in enumerate(tasks):
                        card_position = f"a{_BASE_62[j % 62]}"
                        await self._card_repo.create(
                            column_id=created_col["id"],
                            title=task_data.get("title", "Untitled Task"),
                            description=task_data.get("description", ""),
                            position=card_position,
                            priority=task_data.get("priority"),
                        )
        else:
            await self._col_repo.create(board_id, "In Progress", "a0")
            await self._col_repo.create(board_id, "Done", "a1")
        if initial_sprint and self._sprint_repo:
            await self._sprint_repo.create(
                board_id=board_id,
                name=initial_sprint.get("name", "Sprint 1"),
                goal=initial_sprint.get("goal"),
                start_date=initial_sprint.get("start_date"),
                end_date=initial_sprint.get("end_date"),
            )
        return board

    async def update_board(self, board_id: str, title: str, user_id: str) -> dict[str, Any]:
        await self._assert_owner(board_id, user_id)
        return await self._repo.update(board_id, title)

    async def delete_board(self, board_id: str, user_id: str) -> None:
        await self._assert_owner(board_id, user_id)
        await self._repo.delete(board_id)

    async def archive_board(self, board_id: str, user_id: str) -> None:
        await self._assert_owner(board_id, user_id)
        await self._repo.set_archived(board_id, True)

    async def unarchive_board(self, board_id: str, user_id: str) -> None:
        await self._assert_owner(board_id, user_id)
        await self._repo.set_archived(board_id, False)

    async def list_archived_boards(self, user_id: str) -> list[dict[str, Any]]:
        return await self._repo.list_archived(user_id)

    # ── Members ───────────────────────────────────────────────────────────────

    async def invite_member(self, board_id: str, user_id: str, email: str, role: str) -> dict[str, Any]:
        await self._assert_owner(board_id, user_id)
        board = await self._repo.get_board(board_id)
        result = await self._repo.invite_member(board_id, email, role)
        if board:
            await self._notify_board_invite(board, user_id, email)
        return result

    async def _notify_board_invite(self, board: dict[str, Any], inviter_id: str, email: str) -> None:
        board_title = board["title"]
        inviter_email: str | None = None
        target_user_id: str | None = None

        if self._notif_repo:
            try:
                inviter_email = await self._notif_repo.find_user_email_by_id(inviter_id)
                target_user_id = await self._notif_repo.find_user_id_by_email(email)
            except Exception as exc:
                log.warning("Board davet bildirim sorgusu başarısız: %s", exc)

        inviter_label = inviter_email or "Bir kullanıcı"

        if self._notif_repo and target_user_id:
            try:
                await self._notif_repo.create(
                    user_id=target_user_id,
                    type="board_invite",
                    title=f"'{board_title}' projesine davet edildiniz",
                    body=f"{inviter_label} sizi '{board_title}' projesine davet etti.",
                    data={
                        "board_id": board["id"],
                        "board_title": board_title,
                        "inviter_id": inviter_id,
                        "inviter_email": inviter_label,
                    },
                )
            except Exception as exc:
                log.warning("Board davet bildirimi oluşturulamadı: %s", exc)

        if self._admin_sb:
            try:
                from gotrue.types import InviteUserByEmailOptions  # type: ignore[import]
                options = InviteUserByEmailOptions(
                    data={"board_title": board_title, "inviter_email": inviter_label}
                )
                await self._admin_sb.auth.admin.invite_user_by_email(email, options=options)
                log.info("Board davet emaili gönderildi: %s", email)
            except Exception as exc:
                log.warning("Board davet emaili gönderilemedi: %s", exc)

    async def list_members(self, board_id: str, user_id: str) -> list[dict[str, Any]]:
        await self._assert_access(board_id, user_id)
        return await self._repo.list_members(board_id)

    async def remove_member(self, board_id: str, member_id: str, user_id: str) -> None:
        await self._assert_owner(board_id, user_id)
        await self._repo.remove_member(board_id, member_id)

    # ── Invitations ───────────────────────────────────────────────────────────

    async def list_pending_invitations(self, email: str) -> list[dict[str, Any]]:
        return await self._repo.list_pending_invitations(email)

    async def accept_invitation(self, board_id: str, email: str, user_id: str) -> None:
        await self._repo.accept_invitation(board_id, email, user_id)

    async def decline_invitation(self, board_id: str, email: str) -> None:
        await self._repo.decline_invitation(board_id, email)
