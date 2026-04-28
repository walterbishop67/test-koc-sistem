from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.dependencies import get_current_user, get_team_controller
from app.infrastructure.auth.jwt import AuthenticatedUser
from app.services.team_services.controllers.team_controller import TeamController
from app.services.team_services.schemas.team_schemas import TeamCreate, TeamMemberAdd

router = APIRouter()


# ── Invitations (önce tanımla — /{team_id} pattern'inden önce gelmeli) ────────

@router.get("/invitations")
async def list_pending_invitations(
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: TeamController = Depends(get_team_controller),
):
    return await ctrl.list_pending_invitations(user.email or "")


@router.post("/invitations/{team_id}/accept", status_code=status.HTTP_204_NO_CONTENT)
async def accept_invitation(
    team_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: TeamController = Depends(get_team_controller),
):
    await ctrl.accept_invitation(team_id, user.email or "", user.id)


@router.post("/invitations/{team_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
async def decline_invitation(
    team_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: TeamController = Depends(get_team_controller),
):
    await ctrl.decline_invitation(team_id, user.email or "")


# ── Teams ─────────────────────────────────────────────────────────────────────

@router.get("")
async def list_teams(
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: TeamController = Depends(get_team_controller),
):
    return await ctrl.list_teams(user.id)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_team(
    body: TeamCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: TeamController = Depends(get_team_controller),
):
    return await ctrl.create_team(body.name, user.id)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: TeamController = Depends(get_team_controller),
):
    await ctrl.delete_team(team_id, user.id)


@router.get("/{team_id}/members")
async def list_members(
    team_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: TeamController = Depends(get_team_controller),
):
    return await ctrl.list_members(team_id, user.id)


@router.post("/{team_id}/members", status_code=status.HTTP_201_CREATED)
async def add_member(
    team_id: str,
    body: TeamMemberAdd,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: TeamController = Depends(get_team_controller),
):
    return await ctrl.add_member(team_id, user.id, body.email)


@router.delete("/{team_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    team_id: str,
    member_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: TeamController = Depends(get_team_controller),
):
    await ctrl.remove_member(team_id, member_id, user.id)
