from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel


class BoardInsightsRequest(BaseModel):
    board_title: str
    columns: list[dict[str, Any]]  # [{title, cards: [{title, priority, due_date, assignee_email}]}]
    sprint: Optional[dict[str, Any]] = None  # {name, goal, state, start_date, end_date}
    total_members: int = 0


class CardDescriptionRequest(BaseModel):
    card_title: str
    sprint_goal: Optional[str] = None
    column_title: Optional[str] = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class BoardChatRequest(BoardInsightsRequest):
    messages: list[ChatMessage]


class AIInsightsResponse(BaseModel):
    summary: str
    suggestions: list[str]
    risks: list[str]


class CardDescriptionResponse(BaseModel):
    description: str


class GeneratedTask(BaseModel):
    title: str
    description: str
    priority: Literal["urgent", "high", "medium", "low"]


class GeneratedColumn(BaseModel):
    name: str
    tasks: list[GeneratedTask]


class GenerateBoardRequest(BaseModel):
    project_name: str
    project_goal: str


class GenerateBoardResponse(BaseModel):
    columns: list[GeneratedColumn]
