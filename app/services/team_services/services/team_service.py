from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.infrastructure.shared.exceptions import ForbiddenError
from app.infrastructure.shared.logger import get_logger
from app.services.team_services.repository.team_repository import TeamRepository

if TYPE_CHECKING:
    from app.services.notification_services.repository.notification_repository import NotificationRepository

log = get_logger(__name__)


class TeamService:
    def __init__(
        self,
        repo: TeamRepository,
        notif_repo: "NotificationRepository | None" = None,
        admin_sb: Any = None,
    ):
        self._repo = repo
        self._notif_repo = notif_repo
        self._admin_sb = admin_sb  # Supabase admin client (service role key ile)

    async def _assert_owner(self, team_id: str, user_id: str) -> None:
        team = await self._repo.get_owned(team_id, user_id)
        if not team:
            raise ForbiddenError("Team not found or not owner")

    async def _assert_access(self, team_id: str, user_id: str) -> None:
        has_access = await self._repo.can_access(team_id, user_id)
        if not has_access:
            raise ForbiddenError("Team not found or access denied")

    async def list_teams(self, user_id: str) -> list[dict[str, Any]]:
        return await self._repo.list_for_user(user_id)

    async def create_team(self, name: str, user_id: str) -> dict[str, Any]:
        return await self._repo.create(name, user_id)

    async def delete_team(self, team_id: str, user_id: str) -> None:
        await self._assert_owner(team_id, user_id)
        await self._repo.delete(team_id)

    async def list_members(self, team_id: str, user_id: str) -> list[dict[str, Any]]:
        await self._assert_access(team_id, user_id)
        return await self._repo.list_members(team_id)

    async def add_member(self, team_id: str, user_id: str, email: str) -> dict[str, Any]:
        await self._assert_owner(team_id, user_id)
        team = await self._repo.get_team(team_id)
        result = await self._repo.add_member(team_id, email)

        if team:
            await self._notify_invite(team, user_id, email)

        return result

    async def _notify_invite(self, team: dict[str, Any], inviter_id: str, email: str) -> None:
        team_name = team["name"]
        inviter_email: str | None = None
        target_user_id: str | None = None

        if self._notif_repo:
            try:
                inviter_email = await self._notif_repo.find_user_email_by_id(inviter_id)
                target_user_id = await self._notif_repo.find_user_id_by_email(email)
            except Exception as exc:
                log.warning("Bildirim kullanıcı sorgusu başarısız: %s", exc)

        inviter_label = inviter_email or "Bir kullanıcı"

        # Uygulama içi bildirim
        if self._notif_repo and target_user_id:
            try:
                await self._notif_repo.create(
                    user_id=target_user_id,
                    type="team_invite",
                    title=f"'{team_name}' takımına davet edildiniz",
                    body=f"{inviter_label} sizi '{team_name}' takımına davet etti.",
                    data={"team_id": team["id"], "team_name": team_name, "inviter_id": inviter_id},
                )
            except Exception as exc:
                log.warning("Bildirim oluşturulamadı: %s", exc)

        # Email bildirimi (service role key tanımlıysa)
        if self._admin_sb:
            try:
                from gotrue.types import InviteUserByEmailOptions  # type: ignore[import]
                options = InviteUserByEmailOptions(
                    data={"team_name": team_name, "inviter_email": inviter_label}
                )
                await self._admin_sb.auth.admin.invite_user_by_email(email, options=options)
                log.info("Davet emaili gönderildi: %s", email)
            except Exception as exc:
                log.warning("Davet emaili gönderilemedi: %s", exc)

    async def remove_member(self, team_id: str, member_id: str, user_id: str) -> None:
        await self._assert_owner(team_id, user_id)
        await self._repo.remove_member(team_id, member_id)

    async def list_pending_invitations(self, email: str) -> list[dict[str, Any]]:
        return await self._repo.list_pending_invitations(email)

    async def accept_invitation(self, team_id: str, email: str, user_id: str) -> None:
        await self._repo.accept_invitation(team_id, email, user_id)

    async def decline_invitation(self, team_id: str, email: str) -> None:
        await self._repo.decline_invitation(team_id, email)
