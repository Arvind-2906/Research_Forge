"""ResearchForge AI Engine - Main Application.

FastAPI application entrypoint orchestrating multi-agent research with LangGraph.
"""

import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from contextlib import asynccontextmanager
import time
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config.settings import get_settings
from utils.logger import logger
from database.connection import db
from api.routes.health import router as health_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages application lifecycle: pool setup, checks, and clean shutdown."""
    logger.info("[Lifecycle] Starting ResearchForge AI Engine...")
    try:
        await db.connect()
        logger.info("[Lifecycle] Database connection pool initialized.")
    except Exception as e:
        logger.error(f"[Lifecycle] Failed to initialize database connection: {e}")

    yield

    logger.info("[Lifecycle] Shutting down AI Engine...")
    await db.disconnect()
    logger.info("[Lifecycle] AI Engine shutdown complete.")


app = FastAPI(
    title="ResearchForge AI Engine",
    description="Multi-agent research orchestration powered by LangGraph, Groq, and remote MCP.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        settings.NODE_BACKEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Structured Request Logging Middleware
@app.middleware("http")
async def logging_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    logger.info(
        f"[HTTP] {request.method} {request.url.path} {response.status_code} ({duration_ms}ms)"
    )
    return response


# Centralized Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"[Unhandled Exception] {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "message": "An internal server error occurred in AI Engine.",
                "code": "AI_ENGINE_INTERNAL_ERROR",
            },
        },
    )


# Mount routers
app.include_router(health_router)
app.include_router(health_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
    )
