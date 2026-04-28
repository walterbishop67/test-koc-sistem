from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class ColumnCreate(BaseModel):
    title: str
    position: str


class ColumnUpdate(BaseModel):
    title: Optional[str] = None
    position: Optional[str] = None
