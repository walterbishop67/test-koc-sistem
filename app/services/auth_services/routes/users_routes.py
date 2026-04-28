from __future__ import annotations

import math

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import get_current_user, get_supabase
from app.infrastructure.auth.jwt import AuthenticatedUser
from app.services.auth_services.schemas.auth_schemas import ProfileResponse, ProfileUpdateBody
from supabase import AsyncClient

router = APIRouter()


@router.get("")
async def list_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    q: str = Query(default=""),
    user: AuthenticatedUser = Depends(get_current_user),
    sb: AsyncClient = Depends(get_supabase),
):
    start = (page - 1) * limit
    end = start + limit - 1
    query = (
        sb.table("users")
        .select("id, email, full_name", count="exact")
        .neq("id", user.id)
        .order("email")
    )
    if q.strip():
        query = query.ilike("email", f"%{q.strip()}%")
    res = await query.range(start, end).execute()
    total = res.count or 0
    return {
        "items": res.data,
        "total": total,
        "page": page,
        "page_size": limit,
        "total_pages": max(1, math.ceil(total / limit)),
    }


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    user: AuthenticatedUser = Depends(get_current_user),
    sb: AsyncClient = Depends(get_supabase),
):
    res = await sb.table("users").select("id, email, full_name").eq("id", user.id).single().execute()
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Kullanıcı bulunamadı")
    return res.data


@router.patch("/me", response_model=ProfileResponse)
async def update_my_profile(
    body: ProfileUpdateBody,
    user: AuthenticatedUser = Depends(get_current_user),
    sb: AsyncClient = Depends(get_supabase),
):
    res = (
        await sb.table("users")
        .update({"full_name": body.full_name})
        .eq("id", user.id)
        .select("id, email, full_name")
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Kullanıcı bulunamadı")
    return res.data


@router.get("/search")
async def search_users(
    q: str = Query(default="", min_length=0),
    limit: int = Query(default=10, le=50),
    user: AuthenticatedUser = Depends(get_current_user),
    sb: AsyncClient = Depends(get_supabase),
):
    if not q.strip():
        return []
    res = (
        await sb.table("users")
        .select("id, email, full_name")
        .ilike("email", f"%{q.strip()}%")
        .neq("id", user.id)
        .limit(limit)
        .execute()
    )
    return res.data
