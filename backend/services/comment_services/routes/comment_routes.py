from __future__ import annotations

from fastapi import APIRouter, Depends, status

from backend.dependencies import get_comment_controller, get_current_user
from backend.infrastructure.auth.jwt import AuthenticatedUser
from backend.services.comment_services.controllers.comment_controller import CommentController
from backend.services.comment_services.schemas.comment_schemas import CommentCreate

router = APIRouter()


@router.get("/cards/{card_id}/comments")
async def list_comments(
    card_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: CommentController = Depends(get_comment_controller),
):
    return await ctrl.list_comments(card_id, user.id)


@router.post("/cards/{card_id}/comments", status_code=status.HTTP_201_CREATED)
async def create_comment(
    card_id: str,
    body: CommentCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: CommentController = Depends(get_comment_controller),
):
    return await ctrl.create_comment(card_id, user.id, body.content)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: CommentController = Depends(get_comment_controller),
):
    await ctrl.delete_comment(comment_id, user.id)
