"""ResearchForge AI Engine - Pytest Global Fixtures.
"""

import sys
import asyncio
import pytest

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from database.connection import db


@pytest.fixture(autouse=True)
async def cleanup_db_connections():
    """Ensure database connection pool is cleanly closed at the end of each test."""
    yield
    await db.disconnect()

