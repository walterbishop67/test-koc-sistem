from __future__ import annotations

from pydantic import BaseModel, Field


class AuthBody(BaseModel):
    email: str
    password: str


class SignupBody(BaseModel):
    full_name: str
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


class ProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str | None


class ProfileUpdateBody(BaseModel):
    full_name: str = Field(min_length=1, max_length=100)
