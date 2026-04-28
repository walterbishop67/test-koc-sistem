from __future__ import annotations

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    title: str
    description: str = ""


class ProjectUpdate(BaseModel):
    title: str
    description: str = ""


class ProjectResponse(BaseModel):
    id: str
    title: str
    description: str
    owner_id: str
    created_at: str | None = None

    model_config = {"from_attributes": True}
