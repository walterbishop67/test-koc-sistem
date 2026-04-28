from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AITaskData(BaseModel):
    title: str
    description: str = ""
    priority: str | None = None


class AIColumnData(BaseModel):
    name: str
    tasks: list[AITaskData] = Field(default_factory=list)


class BoardCreate(BaseModel):
    title: str
    team_id: str | None = None
    initial_sprint: Any | None = None  # SprintCreate payload — type Any, circular import önlemi
    ai_columns: list[AIColumnData] | None = None


class BoardUpdate(BaseModel):
    title: str


class BoardResponse(BaseModel):
    id: str
    title: str
    owner_id: str
    created_at: str | None = None
    is_archived: bool = False
    team_names: list[str] = []

    model_config = {"from_attributes": True}


class MemberInvite(BaseModel):
    email: str
    role: str = "member"


class MemberResponse(BaseModel):
    id: str
    board_id: str
    invited_email: str
    user_id: str | None = None
    role: str
    status: str
    created_at: str | None = None
