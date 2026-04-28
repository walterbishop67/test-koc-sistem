from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.dependencies import get_board_controller, get_current_user
from app.infrastructure.auth.jwt import AuthenticatedUser
from app.services.board_services.controllers.board_controller import BoardController
from app.services.board_services.schemas.board_schemas import BoardCreate, BoardUpdate, MemberInvite

router = APIRouter()


# ── Invitations (önce tanımla — /{board_id} pattern'inden önce gelmeli) ───────

@router.get("/invitations")
async def list_pending_invitations(
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: BoardController = Depends(get_board_controller),
):
    return await ctrl.list_pending_invitations(user.email or "")


@router.post("/invitations/{board_id}/accept", status_code=status.HTTP_204_NO_CONTENT)
async def accept_invitation(
    board_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: BoardController = Depends(get_board_controller),
):
    await ctrl.accept_invitation(board_id, user.email or "", user.id)


@router.post("/invitations/{board_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
async def decline_invitation(
    board_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: BoardController = Depends(get_board_controller),
):
    await ctrl.decline_invitation(board_id, user.email or "")


# ── Boards ────────────────────────────────────────────────────────────────────

@router.get("/archived")
async def list_archived_boards(
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: BoardController = Depends(get_board_controller),
):
    return await ctrl.list_archived_boards(user.id)


@router.get("")
async def list_boards(
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: BoardController = Depends(get_board_controller),
):
    return await ctrl.list_boards(user.id, user.email or "")


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_board(
    body: BoardCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: BoardController = Depends(get_board_controller),
):
    sprint_data = body.initial_sprint if isinstance(body.initial_sprint, dict) else (
        body.initial_sprint.model_dump() if body.initial_sprint is not None else None
    )
    ai_columns_data = [col.model_dump() for col in body.ai_columns] if body.ai_columns else None
    return await ctrl.create_board(body.title, user.id, sprint_data, body.team_id, ai_columns_data)


@router.put("/{board_id}")
async def update_board(
    board_id: str,
    body: BoardUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: BoardController = Depends(get_board_controller),
):
    return await ctrl.update_board(board_id, body.title, user.id)


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    board_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: BoardController = Depends(get_board_controller),
):
    await ctrl.delete_board(board_id, user.id)


@router.patch("/{board_id}/archive", status_code=status.HTTP_204_NO_CONTENT)
async def archive_board(
    board_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: BoardController = Depends(get_board_controller),
):
    await ctrl.archive_board(board_id, user.id)


@router.patch("/{board_id}/unarchive", status_code=status.HTTP_204_NO_CONTENT)
async def unarchive_board(
    board_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: BoardController = Depends(get_board_controller),
):
    await ctrl.unarchive_board(board_id, user.id)


# ── Members ───────────────────────────────────────────────────────────────────

@router.get("/{board_id}/members")
async def list_members(
    board_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: BoardController = Depends(get_board_controller),
):
    return await ctrl.list_members(board_id, user.id)


@router.post("/{board_id}/members", status_code=status.HTTP_201_CREATED)
async def invite_member(
    board_id: str,
    body: MemberInvite,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: BoardController = Depends(get_board_controller),
):
    return await ctrl.invite_member(board_id, user.id, body.email, body.role)


@router.delete("/{board_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    board_id: str,
    member_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    ctrl: BoardController = Depends(get_board_controller),
):
    await ctrl.remove_member(board_id, member_id, user.id)
