"""FastAPI application factory.

Mimari kural:
  - Tüm infra bağlantıları (Supabase) lifespan içinde açılır.
  - Açılan nesneler app.state'e yazılır — başka hiçbir yerde oluşturulmaz.
  - dependencies.py sadece app.state'den okur.
"""

from __future__ import annotations

import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.config import get_settings
from backend.infrastructure.db.migrator import run_migrations
from backend.infrastructure.shared.logger import get_logger, setup_logging, trace_step
from backend.infrastructure.supabase.client import close_client, init_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    setup_logging(settings.log_level)
    log = get_logger(__name__)
    log.info("TaskFlow API başlatılıyor")
    trace_step("lifespan", phase="startup")

    if settings.supabase_db_url:
        await run_migrations(settings.supabase_db_url)
        trace_step("migrations_applied")
    else:
        log.warning("SUPABASE_DB_URL tanımlı değil — migration'lar atlandı")

    supabase = await init_client(settings)
    app.state.supabase = supabase

    if settings.supabase_service_role_key:
        from supabase import acreate_client
        app.state.supabase_admin = await acreate_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
        log.info("Supabase admin client oluşturuldu (email desteği aktif)")
    else:
        app.state.supabase_admin = None

    trace_step("supabase_connected")

    log.info("TaskFlow API hazır")
    yield

    trace_step("lifespan", phase="shutdown")
    await close_client()
    log.info("Kapatma tamamlandı")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_title,
        version=settings.app_version,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Router kaydı ─────────────────────────────────────────────────────────
    from backend.services.auth_services.routes.auth_routes import router as auth_router
    from backend.services.auth_services.routes.users_routes import router as users_router
    from backend.services.board_services.routes.board_routes import router as board_router
    from backend.services.card_services.routes.card_routes import router as card_router
    from backend.services.column_services.routes.column_routes import router as column_router
    from backend.services.comment_services.routes.comment_routes import router as comment_router
    from backend.services.notification_services.routes.notification_routes import router as notification_router
    from backend.services.sprint_services.routes.sprint_routes import router as sprint_router
    from backend.services.ai_services.routes.ai_routes import router as ai_router
    from backend.services.label_services.routes.label_routes import router as label_router
    from backend.services.team_services.routes.team_routes import router as team_router
    from backend.services.project_services.routes.project_routes import router as project_router

    app.include_router(auth_router,         prefix="/api/v1/auth",          tags=["auth"])
    app.include_router(users_router,        prefix="/api/v1/users",         tags=["users"])
    app.include_router(board_router,        prefix="/api/v1/boards",        tags=["boards"])
    app.include_router(column_router,       prefix="/api/v1",               tags=["columns"])
    app.include_router(card_router,         prefix="/api/v1",               tags=["cards"])
    app.include_router(comment_router,      prefix="/api/v1",               tags=["comments"])
    app.include_router(sprint_router,       prefix="/api/v1",               tags=["sprints"])
    app.include_router(team_router,         prefix="/api/v1/teams",         tags=["teams"])
    app.include_router(notification_router, prefix="/api/v1/notifications", tags=["notifications"])
    app.include_router(ai_router,           prefix="/api/v1",               tags=["ai"])
    app.include_router(label_router,        prefix="/api/v1",               tags=["labels"])
    app.include_router(project_router,      prefix="/api/v1/projects",      tags=["projects"])

    # ── HTTP request loglama ─────────────────────────────────────────────────
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start = time.perf_counter()
        log = get_logger("app.main")
        log.info("→ %s %s", request.method, request.url.path)
        response = await call_next(request)
        elapsed = (time.perf_counter() - start) * 1000
        log.info("← %s %s → %s (%.0fms)", request.method, request.url.path, response.status_code, elapsed)
        return response

    # ── Hata yönetimi ────────────────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        get_logger("app.main").exception("İşlenmeyen hata: %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"error": "internal_server_error", "detail": str(exc)})

    # ── Health check ─────────────────────────────────────────────────────────
    @app.get("/api/health", tags=["health"])
    async def health():
        sb = getattr(app.state, "supabase", None)
        return {"status": "ok" if sb is not None else "degraded"}

    # ── Frontend (production SPA) ────────────────────────────────────────────
    _dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
    if os.path.exists(_dist):
        app.mount("/assets", StaticFiles(directory=os.path.join(_dist, "assets")), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        async def serve_spa():
            return FileResponse(os.path.join(_dist, "index.html"))

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
