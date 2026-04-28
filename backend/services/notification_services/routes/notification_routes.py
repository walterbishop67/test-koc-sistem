from __future__ import annotations

from fastapi import APIRouter, Depends, status

from backend.dependencies import get_current_user, get_notification_controller
from backend.infrastructure.auth.jwt import AuthenticatedUser
from backend.services.notification_services.controllers.notification_controller import NotificationController

router = APIRouter()


@router.get("")
async def list_notifications(
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: NotificationController = Depends(get_notification_controller),
):
    return await ctrl.list(user.id)


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    notification_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: NotificationController = Depends(get_notification_controller),
):
    await ctrl.mark_read(notification_id, user.id)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: NotificationController = Depends(get_notification_controller),
):
    await ctrl.mark_all_read(user.id)
