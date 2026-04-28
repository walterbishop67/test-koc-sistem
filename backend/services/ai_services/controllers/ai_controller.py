from __future__ import annotations

from typing import AsyncGenerator

from backend.services.ai_services.schemas.ai_schemas import (
    AIInsightsResponse,
    BoardChatRequest,
    BoardInsightsRequest,
    CardDescriptionRequest,
    CardDescriptionResponse,
    GenerateBoardRequest,
    GenerateBoardResponse,
)
from backend.services.ai_services.services.ai_service import AIService


class AIController:
    def __init__(self, svc: AIService):
        self._svc = svc

    async def get_board_insights(self, req: BoardInsightsRequest) -> AIInsightsResponse:
        return await self._svc.get_board_insights(req)

    async def stream_board_insights(self, req: BoardInsightsRequest) -> AsyncGenerator[str, None]:
        return self._svc.stream_board_insights(req)

    async def stream_board_chat(self, req: BoardChatRequest) -> AsyncGenerator[str, None]:
        return self._svc.stream_board_chat(req)

    async def get_card_description(self, req: CardDescriptionRequest) -> CardDescriptionResponse:
        return await self._svc.get_card_description(req)

    async def generate_board_structure(self, req: GenerateBoardRequest) -> GenerateBoardResponse:
        return await self._svc.generate_board_structure(req)
