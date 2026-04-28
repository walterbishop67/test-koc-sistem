from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.dependencies import get_column_controller, get_current_user
from app.infrastructure.auth.jwt import AuthenticatedUser
from app.services.column_services.controllers.column_controller import ColumnController
from app.services.column_services.schemas.column_schemas import ColumnCreate, ColumnUpdate

router = APIRouter()


@router.get("/boards/{board_id}/columns")
async def list_columns(
    board_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: ColumnController = Depends(get_column_controller),
):
    return await ctrl.list_columns(board_id, user.id)


@router.post("/boards/{board_id}/columns", status_code=status.HTTP_201_CREATED)
async def create_column(
    board_id: str,
    body: ColumnCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: ColumnController = Depends(get_column_controller),
):
    return await ctrl.create_column(board_id, body.title, body.position, user.id)


@router.put("/columns/{column_id}")
async def update_column(
    column_id: str,
    body: ColumnUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: ColumnController = Depends(get_column_controller),
):
    return await ctrl.update_column(column_id, body.title, body.position, user.id)


@router.delete("/columns/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_column(
    column_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: ColumnController = Depends(get_column_controller),
):
    await ctrl.delete_column(column_id, user.id)
