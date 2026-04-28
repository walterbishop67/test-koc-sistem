from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from backend.dependencies import get_ai_controller, get_current_user
from backend.infrastructure.auth.jwt import AuthenticatedUser
from backend.services.ai_services.controllers.ai_controller import AIController
from backend.services.ai_services.schemas.ai_schemas import (
    AIInsightsResponse,
    BoardChatRequest,
    BoardInsightsRequest,
    CardDescriptionRequest,
    CardDescriptionResponse,
    GenerateBoardRequest,
    GenerateBoardResponse,
)

router = APIRouter()


@router.post("/ai/board-insights", response_model=AIInsightsResponse)
async def board_insights(
    body: BoardInsightsRequest,
    _user: AuthenticatedUser = Depends(get_current_user),
    ctrl: AIController = Depends(get_ai_controller),
):
    return await ctrl.get_board_insights(body)


@router.post("/ai/board-insights/stream")
async def board_insights_stream(
    body: BoardInsightsRequest,
    _user: AuthenticatedUser = Depends(get_current_user),
    ctrl: AIController = Depends(get_ai_controller),
):
    async def generate():
        try:
            gen = await ctrl.stream_board_insights(body)
            async for chunk in gen:
                yield f"data: {json.dumps({'delta': chunk}, ensure_ascii=False)}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/ai/card-description", response_model=CardDescriptionResponse)
async def card_description(
    body: CardDescriptionRequest,
    _user: AuthenticatedUser = Depends(get_current_user),
    ctrl: AIController = Depends(get_ai_controller),
):
    return await ctrl.get_card_description(body)


@router.post("/ai/board-chat/stream")
async def board_chat_stream(
    body: BoardChatRequest,
    _user: AuthenticatedUser = Depends(get_current_user),
    ctrl: AIController = Depends(get_ai_controller),
):
    async def generate():
        try:
            gen = await ctrl.stream_board_chat(body)
            async for chunk in gen:
                yield f"data: {json.dumps({'delta': chunk}, ensure_ascii=False)}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/ai/generate-board", response_model=GenerateBoardResponse)
async def generate_board(
    body: GenerateBoardRequest,
    _user: AuthenticatedUser = Depends(get_current_user),
    ctrl: AIController = Depends(get_ai_controller),
):
    return await ctrl.generate_board_structure(body)
