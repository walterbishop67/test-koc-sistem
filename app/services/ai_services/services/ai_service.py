from __future__ import annotations

import json
from typing import Any, AsyncGenerator, Optional

from fastapi import HTTPException, status

from app.services.ai_services.schemas.ai_schemas import (
    AIInsightsResponse,
    BoardChatRequest,
    BoardInsightsRequest,
    CardDescriptionRequest,
    CardDescriptionResponse,
    GenerateBoardRequest,
    GenerateBoardResponse,
)

_STREAMING_PROMPT_SUFFIX = """
Yanıtını SADECE aşağıdaki formatta yaz, başka hiçbir şey ekleme:

ÖZET: <2-3 cümlelik genel durum değerlendirmesi>

ÖNERİ: <somut öneri 1>
ÖNERİ: <somut öneri 2>
ÖNERİ: <somut öneri 3>

RİSK: <dikkat edilmesi gereken risk 1>
RİSK: <dikkat edilmesi gereken risk 2>"""


class AIService:
    def __init__(self, api_key: Optional[str]):
        self._api_key = api_key

    def _get_client(self):
        if not self._api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI özelliği şu an devre dışı. OPENAI_API_KEY tanımlı değil.",
            )
        from openai import AsyncOpenAI
        return AsyncOpenAI(api_key=self._api_key)

    def _build_prompt(self, req: BoardInsightsRequest) -> str:
        sprint_info = _format_sprint(req.sprint)
        columns_text = _format_columns(req.columns, req.sprint)
        return (
            f"Sen deneyimli bir Agile koçusun. Aşağıdaki Kanban board verisini analiz et.\n\n"
            f"Board: {req.board_title}\n"
            f"Üye sayısı: {req.total_members}\n"
            f"{sprint_info}\n\n"
            f"Sütun ve kart detayları:\n{columns_text}"
        )

    async def get_board_insights(self, req: BoardInsightsRequest) -> AIInsightsResponse:
        client = self._get_client()
        prompt = self._build_prompt(req) + "\n\nAşağıdaki JSON formatında, Türkçe yanıtla:\n" + json.dumps({
            "summary": "2-3 cümlelik genel durum özeti",
            "suggestions": ["öneri 1", "öneri 2", "öneri 3"],
            "risks": ["risk 1", "risk 2"],
        }, ensure_ascii=False) + "\n\nSadece JSON döndür."

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=700,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        return AIInsightsResponse(
            summary=data.get("summary", ""),
            suggestions=data.get("suggestions", []),
            risks=data.get("risks", []),
        )

    async def stream_board_insights(self, req: BoardInsightsRequest) -> AsyncGenerator[str, None]:
        client = self._get_client()
        prompt = self._build_prompt(req) + _STREAMING_PROMPT_SUFFIX

        stream = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=700,
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield delta

    async def stream_board_chat(self, req: BoardChatRequest) -> AsyncGenerator[str, None]:
        client = self._get_client()
        prompt = self._build_prompt(req)
        messages = [
            {
                "role": "system",
                "content": (
                    "Sen deneyimli bir Agile koçusun. Kullanıcının sorularını Türkçe, doğal dilde ve kısa net şekilde yanıtla. "
                    "Yanıtlarını sadece verilen board bağlamı ve konuşma geçmişine göre üret."
                ),
            },
            {
                "role": "system",
                "content": prompt,
            },
        ]
        messages.extend(
            {"role": m.role, "content": m.content}
            for m in req.messages
            if m.content.strip()
        )

        stream = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=700,
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                yield delta

    async def get_card_description(self, req: CardDescriptionRequest) -> CardDescriptionResponse:
        client = self._get_client()

        context_parts = []
        if req.sprint_goal:
            context_parts.append(f"Sprint hedefi: {req.sprint_goal}")
        if req.column_title:
            context_parts.append(f"Sütun: {req.column_title}")
        context = "\n".join(context_parts) if context_parts else ""

        prompt = (
            f'Kart başlığı: "{req.card_title}"\n'
            f"{context}\n\n"
            "Bu Kanban kartı için kısa, net ve uygulanabilir bir açıklama yaz (2-4 cümle, Türkçe).\n"
            "Açıklama: ne yapılacağını, neden önemli olduğunu ve varsa kabul kriterlerini kapsasın.\n"
            "Sadece açıklama metnini döndür, başka hiçbir şey ekleme."
        )

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=300,
        )

        description = (response.choices[0].message.content or "").strip()
        return CardDescriptionResponse(description=description)

    async def generate_board_structure(self, req: GenerateBoardRequest) -> GenerateBoardResponse:
        client = self._get_client()
        response = await client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Kanban board uzmanısın. Proje hedeflerini 3-5 kolona ve anlamlı task'lara böl.",
                },
                {
                    "role": "user",
                    "content": (
                        f"Proje adı: {req.project_name}\n"
                        f"Proje hedefi: {req.project_goal}\n\n"
                        "Lütfen 3 ila 5 kolon üret. Her kolonda uygulanabilir görevler olsun."
                    ),
                },
            ],
            response_format=GenerateBoardResponse,
        )
        parsed = response.choices[0].message.parsed
        if parsed is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI board yapısı üretilemedi.",
            )
        return parsed


# ── Prompt formatting helpers ─────────────────────────────────────────────────

def _format_sprint(sprint: dict[str, Any] | None) -> str:
    if not sprint:
        return "Aktif sprint yok."
    days_info = ""
    if sprint.get("end_date"):
        from datetime import date
        try:
            end = date.fromisoformat(sprint["end_date"])
            delta = (end - date.today()).days
            days_info = f" — {delta} gün kaldı" if delta >= 0 else f" — {abs(delta)} gün gecikmiş"
        except ValueError:
            pass
    return (
        f"Sprint: {sprint.get('name', '?')}{days_info}\n"
        f"Durum: {sprint.get('state', '?')}\n"
        f"Hedef: {sprint.get('goal') or 'belirtilmemiş'}"
    )


def _format_columns(columns: list[dict[str, Any]], sprint: dict[str, Any] | None = None) -> str:
    today_str = __import__("datetime").date.today().isoformat()
    sprint_id = sprint.get("id") if sprint else None
    lines: list[str] = []

    for col in columns:
        cards: list[dict[str, Any]] = col.get("cards", [])
        col_title = col.get("title", "?")
        lines.append(f"\n[{col_title}] — {len(cards)} kart")

        for c in cards:
            card_line = f"  - {c.get('title', '?')}"

            flags: list[str] = []
            p = c.get("priority")
            if p == "urgent":
                flags.append("ACİL")
            elif p == "high":
                flags.append("yüksek öncelik")
            elif p == "medium":
                flags.append("orta öncelik")

            due = c.get("due_date")
            if due:
                if due < today_str:
                    flags.append("GECİKMİŞ")
                else:
                    flags.append(f"bitiş: {due}")

            if c.get("assignee_email"):
                flags.append(f"@{c['assignee_email'].split('@')[0]}")
            else:
                flags.append("atanmamış")

            if sprint_id and c.get("sprint_id") == sprint_id:
                flags.append("sprint'te")

            if flags:
                card_line += f" [{', '.join(flags)}]"

            desc = c.get("description", "")
            if desc:
                snippet = desc[:120].replace("\n", " ").strip()
                card_line += f"\n      → {snippet}{'…' if len(desc) > 120 else ''}"

            lines.append(card_line)

    return "\n".join(lines) if lines else "Sütun yok"
