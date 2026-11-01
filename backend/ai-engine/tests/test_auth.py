import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import pytest
from httpx import ASGITransport, AsyncClient
from main import app
from config.settings import get_settings


@pytest.mark.anyio
async def test_internal_verify_without_key():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/internal/verify")
        assert response.status_code == 403


@pytest.mark.anyio
async def test_internal_verify_with_invalid_key():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/internal/verify",
            headers={"X-Internal-Service-Key": "wrong-secret-key"},
        )
        assert response.status_code == 403


@pytest.mark.anyio
async def test_internal_verify_with_valid_key():
    settings = get_settings()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/internal/verify",
            headers={"X-Internal-Service-Key": settings.INTERNAL_SERVICE_SECRET},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "authenticated"

