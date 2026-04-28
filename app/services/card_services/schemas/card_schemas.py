from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class CardCreate(BaseModel):
    title: str
    position: str
    description: str = ""
    priority: Optional[str] = None
    assignee_email: Optional[str] = None
    due_date: Optional[str] = None
    sprint_id: Optional[str] = None


class CardUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    position: Optional[str] = None
    column_id: Optional[str] = None
    priority: Optional[str] = None
    assignee_email: Optional[str] = None
    due_date: Optional[str] = None
    sprint_id: Optional[str] = None
