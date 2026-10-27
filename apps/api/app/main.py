"""TraceGuard API — Application Entrypoint."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.db.session import Base, engine
from app.routers import (
    auth_router,
    findings_router,
    reports_router,
    scans_router,
    settings_router,
    sites_router,
    users_router,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables for local development/testing with SQLite if needed
    if settings.database_url.startswith("sqlite"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="TraceGuard — Web Privacy & Security Intelligence API",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"^chrome-extension://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api/v1
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users_router, prefix="/api/v1/users", tags=["users"])
app.include_router(scans_router, prefix="/api/v1/scans", tags=["scans"])
app.include_router(findings_router, prefix="/api/v1/findings", tags=["findings"])
app.include_router(sites_router, prefix="/api/v1/sites", tags=["sites"])
app.include_router(reports_router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(settings_router, prefix="/api/v1/settings", tags=["settings"])


@app.get("/health", tags=["system"])
@app.get("/api/v1/health", tags=["system"])
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
    }
