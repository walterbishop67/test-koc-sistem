from __future__ import annotations

from fastapi import APIRouter, Depends, status

from backend.dependencies import get_card_controller, get_current_user
from backend.infrastructure.auth.jwt import AuthenticatedUser
from backend.services.card_services.controllers.card_controller import CardController
from backend.services.card_services.schemas.card_schemas import CardCreate, CardUpdate

router = APIRouter()


@router.post("/columns/{column_id}/cards", status_code=status.HTTP_201_CREATED)
async def create_card(
    column_id: str,
    body: CardCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: CardController = Depends(get_card_controller),
):
    return await ctrl.create_card(
        column_id,
        body.title,
        body.description,
        body.position,
        user.id,
        body.priority,
        body.assignee_email,
    )


@router.put("/cards/{card_id}")
async def update_card(
    card_id: str,
    body: CardUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: CardController = Depends(get_card_controller),
):
    return await ctrl.update_card(card_id, body, user.id)


@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(
    card_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: CardController = Depends(get_card_controller),
):
    await ctrl.delete_card(card_id, user.id)


@router.get("/cards/{card_id}/activity")
async def list_card_activity(
    card_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: CardController = Depends(get_card_controller),
):
    return await ctrl.list_activity(card_id, user.id)
