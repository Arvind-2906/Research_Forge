"""ResearchForge AI Engine - Main Application.

FastAPI application entrypoint orchestrating multi-agent research with LangGraph.
"""

import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from contextlib import asynccontextmanager
import time
from fastapi import FastAPI, Request, status, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config.settings import get_settings
from utils.logger import logger
from database.connection import db
from graph.checkpointer import checkpoint_manager
from api.routes.health import router as health_router
from api.routes.research import router as research_router
from api.dependencies.auth import verify_internal_service_key

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manages application lifecycle: pool setup, checkpoint verification, and clean shutdown."""
    logger.info("[Lifecycle] Starting ResearchForge AI Engine...")
    try:
        await db.connect()
        logger.info("[Lifecycle] Database connection pool initialized.")
        await checkpoint_manager.setup()
        logger.info("[Lifecycle] LangGraph checkpoint tables verified.")
    except Exception as e:
        logger.error(f"[Lifecycle] Initialization warning: {e}")

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


# Pure ASGI Structured Request Logging Middleware
class ASGILoggingMiddleware:
    """Pure ASGI middleware that tracks request latency without Starlette stream buffering."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        start_time = time.time()
        status_code = [200]

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code[0] = message.get("status", 200)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            method = scope.get("method", "GET")
            path = scope.get("path", "")
            logger.info(f"[HTTP] {method} {path} {status_code[0]} ({duration_ms}ms)")


app.add_middleware(ASGILoggingMiddleware)


# Centralized HTTP Exception Handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "detail": exc.detail,
            "error": {
                "message": exc.detail,
                "code": "HTTP_ERROR",
                "statusCode": exc.status_code,
            },
        },
    )


# Centralized Generic Exception Handler
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
app.include_router(research_router)


@app.get("/api/v1/internal/verify", dependencies=[Depends(verify_internal_service_key)], tags=["Internal"])
async def internal_verify():
    return {"status": "authenticated", "service": "ai-engine"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
    )
