from __future__ import annotations

from pydantic import BaseModel


class TeamCreate(BaseModel):
    name: str


class TeamResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    created_at: str | None = None

    model_config = {"from_attributes": True}


class TeamMemberAdd(BaseModel):
    email: str


class TeamMemberResponse(BaseModel):
    id: str
    team_id: str
    email: str
    created_at: str | None = None

    model_config = {"from_attributes": True}
