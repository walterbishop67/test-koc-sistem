from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, model_validator


class SprintCreate(BaseModel):
    name: str
    goal: str | None = None
    start_date: str | None = None  # ISO date: "YYYY-MM-DD"
    end_date: str | None = None

    @model_validator(mode="after")
    def _validate_dates(self) -> SprintCreate:
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date, start_date'ten önce olamaz")
        return self


class SprintUpdate(BaseModel):
    name: str | None = None
    goal: str | None = None
    start_date: str | None = None
    end_date: str | None = None

    @model_validator(mode="after")
    def _validate_dates(self) -> SprintUpdate:
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("end_date, start_date'ten önce olamaz")
        return self


class SprintResponse(BaseModel):
    id: str
    board_id: str
    name: str
    goal: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    state: Literal["future", "active", "completed"] = "future"
    created_at: str | None = None

    model_config = {"from_attributes": True}
