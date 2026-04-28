from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.dependencies import get_auth_service
from backend.services.auth_services.schemas.auth_schemas import AuthBody, MessageResponse, SignupBody, TokenResponse
from backend.services.auth_services.services.auth_service import AuthService

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(body: AuthBody, svc: AuthService = Depends(get_auth_service)):
    token = await svc.login(body.email, body.password)
    return TokenResponse(access_token=token)


@router.post("/signup", status_code=201, response_model=MessageResponse)
async def signup(body: SignupBody, svc: AuthService = Depends(get_auth_service)):
    await svc.signup(body.email, body.password, body.full_name)
    return MessageResponse(message="E-posta doğrulama linki gönderildi")
