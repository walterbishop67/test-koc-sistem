from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.dependencies import get_current_user, get_label_controller
from app.infrastructure.auth.jwt import AuthenticatedUser
from app.services.label_services.controllers.label_controller import LabelController
from app.services.label_services.schemas.label_schemas import LabelCreate, LabelUpdate

router = APIRouter()


@router.get("/boards/{board_id}/labels")
async def list_labels(
    board_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: LabelController = Depends(get_label_controller),
):
    return await ctrl.list_labels(board_id, user.id)


@router.post("/boards/{board_id}/labels", status_code=status.HTTP_201_CREATED)
async def create_label(
    board_id: str,
    body: LabelCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: LabelController = Depends(get_label_controller),
):
    return await ctrl.create_label(board_id, user.id, body.name, body.color)


@router.patch("/labels/{label_id}")
async def update_label(
    label_id: str,
    body: LabelUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: LabelController = Depends(get_label_controller),
):
    return await ctrl.update_label(label_id, user.id, body.name, body.color)


@router.delete("/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_label(
    label_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: LabelController = Depends(get_label_controller),
):
    await ctrl.delete_label(label_id, user.id)


@router.post("/cards/{card_id}/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
async def add_label_to_card(
    card_id: str,
    label_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: LabelController = Depends(get_label_controller),
):
    await ctrl.add_label_to_card(card_id, label_id, user.id)


@router.delete("/cards/{card_id}/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_label_from_card(
    card_id: str,
    label_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: LabelController = Depends(get_label_controller),
):
    await ctrl.remove_label_from_card(card_id, label_id, user.id)
