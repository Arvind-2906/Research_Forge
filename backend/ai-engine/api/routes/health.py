"""ResearchForge AI Engine - Health & Readiness Endpoints."""

from datetime import datetime, timezone
import time
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from database.connection import db
from config.settings import get_settings

router = APIRouter(tags=["Health"])
START_TIME = time.time()


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Liveness probe returning service status."""
    return {
        "status": "ok",
        "service": "ai-engine",
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready")
async def readiness_check():
    """Readiness probe checking Neon DB pool, Groq config, and model settings."""
    settings = get_settings()
    db_healthy = await db.check_health()

    checks = {
        "database": "connected" if db_healthy else "disconnected",
        "groq_configured": bool(settings.GROQ_API_KEY),
        "primary_model": settings.PRIMARY_REASONING_MODEL,
        "lightweight_model": settings.LIGHTWEIGHT_TASK_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL,
        "huggingface_configured": bool(settings.HUGGINGFACE_API_KEY),
    }

    is_ready = db_healthy and bool(settings.GROQ_API_KEY)

    payload = {
        "status": "ready" if is_ready else "not_ready",
        "service": "ai-engine",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if not is_ready:
        return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=payload)

    return payload

