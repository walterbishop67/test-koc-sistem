from __future__ import annotations

from fastapi import APIRouter, Depends, status

from backend.dependencies import get_current_user, get_project_controller
from backend.infrastructure.auth.jwt import AuthenticatedUser
from backend.services.project_services.controllers.project_controller import ProjectController
from backend.services.project_services.schemas.project_schemas import ProjectCreate, ProjectUpdate

router = APIRouter()


@router.get("")
async def list_projects(
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: ProjectController = Depends(get_project_controller),
):
    return await ctrl.list_projects(user.id)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: ProjectController = Depends(get_project_controller),
):
    return await ctrl.create_project(body.title, body.description, user.id)


@router.put("/{project_id}")
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: ProjectController = Depends(get_project_controller),
):
    return await ctrl.update_project(project_id, body.title, body.description, user.id)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: ProjectController = Depends(get_project_controller),
):
    await ctrl.delete_project(project_id, user.id)


@router.get("/{project_id}/boards")
async def list_project_boards(
    project_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: ProjectController = Depends(get_project_controller),
):
    return await ctrl.list_boards(project_id, user.id)
