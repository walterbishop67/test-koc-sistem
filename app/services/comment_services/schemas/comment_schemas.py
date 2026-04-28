from __future__ import annotations

from pydantic import BaseModel


class CommentCreate(BaseModel):
    content: str
