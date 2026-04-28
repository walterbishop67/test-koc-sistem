from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class LabelCreate(BaseModel):
    name: str
    color: str = "#6366f1"


class LabelUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class LabelOut(BaseModel):
    id: str
    board_id: str
    name: str
    color: str
    created_at: Optional[str] = None
