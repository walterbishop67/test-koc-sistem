from __future__ import annotations

from fastapi import APIRouter, Depends, status

from backend.dependencies import get_current_user, get_sprint_controller
from backend.infrastructure.auth.jwt import AuthenticatedUser
from backend.services.sprint_services.controllers.sprint_controller import SprintController
from backend.services.sprint_services.schemas.sprint_schemas import SprintCreate, SprintUpdate

router = APIRouter()


@router.get("/boards/{board_id}/sprints")
async def list_sprints(
    board_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: SprintController = Depends(get_sprint_controller),
):
    return await ctrl.list_sprints(board_id, user.id)


@router.post("/boards/{board_id}/sprints", status_code=status.HTTP_201_CREATED)
async def create_sprint(
    board_id: str,
    body: SprintCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: SprintController = Depends(get_sprint_controller),
):
    return await ctrl.create_sprint(
        board_id, user.id, body.name, body.goal, body.start_date, body.end_date
    )


@router.put("/sprints/{sprint_id}")
async def update_sprint(
    sprint_id: str,
    body: SprintUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: SprintController = Depends(get_sprint_controller),
):
    return await ctrl.update_sprint(
        sprint_id,
        user.id,
        **body.model_dump(exclude_none=True),
    )


@router.delete("/sprints/{sprint_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sprint(
    sprint_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: SprintController = Depends(get_sprint_controller),
):
    await ctrl.delete_sprint(sprint_id, user.id)


@router.patch("/sprints/{sprint_id}/start")
async def start_sprint(
    sprint_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: SprintController = Depends(get_sprint_controller),
):
    return await ctrl.start_sprint(sprint_id, user.id)


@router.patch("/sprints/{sprint_id}/complete")
async def complete_sprint(
    sprint_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: SprintController = Depends(get_sprint_controller),
):
    return await ctrl.complete_sprint(sprint_id, user.id)
