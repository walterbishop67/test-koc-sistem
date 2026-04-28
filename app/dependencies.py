"""FastAPI dependency injection — tüm infra nesneleri app.state üzerinden gelir.

Kural: hiçbir dependency doğrudan infra client oluşturmaz.
       Tüm bağlantılar lifespan içinde açılır, app.state'e yazılır,
       ve buradan okunur.
"""

from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.infrastructure.auth.jwt import AuthenticatedUser, fetch_supabase_user
from supabase import AsyncClient

_bearer = HTTPBearer(auto_error=False)


def get_supabase(request: Request) -> AsyncClient:
    sb: AsyncClient | None = getattr(request.app.state, "supabase", None)
    if sb is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase bağlantısı hazır değil")
    return sb


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header gerekli.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        user_data = await fetch_supabase_user(credentials.credentials, settings)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz veya süresi dolmuş token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    provider = (user_data.get("app_metadata") or {}).get("provider")
    return AuthenticatedUser(
        id=str(user_data.get("id", "")),
        email=user_data.get("email"),
        provider=provider,
    )


# ── Auth ─────────────────────────────────────────────────────────────────────

async def get_auth_service(request: Request):
    from app.services.auth_services.services.auth_service import AuthService
    return AuthService(get_supabase(request))


# ── Board ─────────────────────────────────────────────────────────────────────

async def get_board_controller(request: Request):
    from app.services.board_services.controllers.board_controller import BoardController
    from app.services.board_services.repository.board_repository import BoardRepository
    from app.services.board_services.services.board_service import BoardService
    from app.services.card_services.repository.card_repository import CardRepository
    from app.services.column_services.repository.column_repository import ColumnRepository
    from app.services.notification_services.repository.notification_repository import NotificationRepository
    from app.services.sprint_services.repository.sprint_repository import SprintRepository

    sb = get_supabase(request)
    repo = BoardRepository(sb)
    col_repo = ColumnRepository(sb)
    card_repo = CardRepository(sb)
    notif_repo = NotificationRepository(sb)
    sprint_repo = SprintRepository(sb)
    admin_sb = getattr(request.app.state, "supabase_admin", None)
    svc = BoardService(
        repo,
        col_repo,
        notif_repo=notif_repo,
        admin_sb=admin_sb,
        sprint_repo=sprint_repo,
        card_repo=card_repo,
    )
    return BoardController(svc)


async def get_sprint_controller(request: Request):
    from app.services.board_services.repository.board_repository import BoardRepository
    from app.services.sprint_services.controllers.sprint_controller import SprintController
    from app.services.sprint_services.repository.sprint_repository import SprintRepository
    from app.services.sprint_services.services.sprint_service import SprintService

    sb = get_supabase(request)
    sprint_repo = SprintRepository(sb)
    board_repo = BoardRepository(sb)
    svc = SprintService(sprint_repo, board_repo)
    return SprintController(svc)


# ── Column ────────────────────────────────────────────────────────────────────

async def get_column_controller(request: Request):
    from app.services.board_services.repository.board_repository import BoardRepository
    from app.services.column_services.controllers.column_controller import ColumnController
    from app.services.column_services.repository.column_repository import ColumnRepository
    from app.services.column_services.services.column_service import ColumnService

    sb = get_supabase(request)
    col_repo = ColumnRepository(sb)
    board_repo = BoardRepository(sb)
    svc = ColumnService(col_repo, board_repo)
    return ColumnController(svc)


# ── Team ─────────────────────────────────────────────────────────────────────

async def get_team_controller(request: Request):
    from app.services.notification_services.repository.notification_repository import NotificationRepository
    from app.services.team_services.controllers.team_controller import TeamController
    from app.services.team_services.repository.team_repository import TeamRepository
    from app.services.team_services.services.team_service import TeamService

    sb = get_supabase(request)
    repo = TeamRepository(sb)
    notif_repo = NotificationRepository(sb)
    admin_sb = getattr(request.app.state, "supabase_admin", None)
    svc = TeamService(repo, notif_repo=notif_repo, admin_sb=admin_sb)
    return TeamController(svc)


# ── Notification ──────────────────────────────────────────────────────────────

async def get_notification_controller(request: Request):
    from app.services.notification_services.controllers.notification_controller import NotificationController
    from app.services.notification_services.repository.notification_repository import NotificationRepository
    from app.services.notification_services.services.notification_service import NotificationService

    sb = get_supabase(request)
    repo = NotificationRepository(sb)
    svc = NotificationService(repo)
    return NotificationController(svc)


# ── Card ──────────────────────────────────────────────────────────────────────

async def get_card_controller(request: Request):
    from app.services.card_services.controllers.card_controller import CardController
    from app.services.card_services.repository.activity_repository import ActivityRepository
    from app.services.card_services.repository.card_repository import CardRepository
    from app.services.card_services.services.card_service import CardService

    sb = get_supabase(request)
    repo = CardRepository(sb)
    activity_repo = ActivityRepository(sb)
    svc = CardService(repo, activity_repo)
    return CardController(svc)


# ── Comment ───────────────────────────────────────────────────────────────────

async def get_comment_controller(request: Request):
    from app.services.comment_services.controllers.comment_controller import CommentController
    from app.services.comment_services.repository.comment_repository import CommentRepository
    from app.services.comment_services.services.comment_service import CommentService

    sb = get_supabase(request)
    repo = CommentRepository(sb)
    svc = CommentService(repo)
    return CommentController(svc)


# ── Label ─────────────────────────────────────────────────────────────────────

async def get_label_controller(request: Request):
    from app.services.label_services.controllers.label_controller import LabelController
    from app.services.label_services.repository.label_repository import LabelRepository
    from app.services.label_services.services.label_service import LabelService

    sb = get_supabase(request)
    repo = LabelRepository(sb)
    svc = LabelService(repo)
    return LabelController(svc)


# ── AI ────────────────────────────────────────────────────────────────────────

async def get_ai_controller(settings: Settings = Depends(get_settings)):
    from app.services.ai_services.controllers.ai_controller import AIController
    from app.services.ai_services.services.ai_service import AIService

    svc = AIService(api_key=settings.openai_api_key)
    return AIController(svc)
