"""ResearchForge AI Engine Database Connection.

Provides lightweight asynchronous data access to Neon PostgreSQL.
Schema migrations are exclusively managed by the Node.js backend.
"""

import sys
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator

# Psycopg on Windows requires WindowsSelectorEventLoopPolicy for async socket polling
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from psycopg_pool import AsyncConnectionPool
from pgvector.psycopg import register_vector_async

from config.settings import get_settings
from utils.logger import logger


class DatabaseConnection:
    """Manages async connection pool for Neon PostgreSQL data access."""

    def __init__(self, database_url: str | None = None):
        settings = get_settings()
        self.database_url = database_url or settings.DATABASE_URL
        self.pool: AsyncConnectionPool | None = None
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self):
        """Initializes async connection pool for the active event loop."""
        current_loop = asyncio.get_running_loop()
        if self.pool is not None:
            if self._loop == current_loop and not self.pool.closed:
                return
            # If the event loop changed (e.g. across test cases), discard reference to dead pool
            self.pool = None

        logger.info("[Database] Initializing Neon PostgreSQL async connection pool...")
        self._loop = current_loop
        self.pool = AsyncConnectionPool(
            conninfo=self.database_url,
            min_size=1,
            max_size=10,
            timeout=30.0,
            open=False,
        )
        await self.pool.open()
        # Verify connection and register pgvector
        async with self.pool.connection() as conn:
            await register_vector_async(conn)
            async with conn.cursor() as cur:
                await cur.execute("SELECT 1")
        logger.info("[Database] Neon PostgreSQL async connection pool established and pgvector registered.")

    async def disconnect(self):
        """Closes async connection pool if open on current loop."""
        if self.pool is not None:
            try:
                if not self.pool.closed and self._loop == asyncio.get_running_loop():
                    await self.pool.close()
            except Exception:
                pass
            self.pool = None
            self._loop = None
            logger.info("[Database] Neon PostgreSQL connection pool closed.")

    async def check_health(self) -> bool:
        """Health check probe."""
        try:
            current_loop = asyncio.get_running_loop()
            if self.pool is None or self._loop != current_loop or self.pool.closed:
                await self.connect()
            async with self.pool.connection() as conn:
                async with conn.cursor() as cur:
                    await cur.execute("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"[Database Health] Health check failed: {e}")
            return False

    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator:
        """Yields an active database connection with pgvector registered."""
        current_loop = asyncio.get_running_loop()
        if self.pool is None or self._loop != current_loop or self.pool.closed:
            await self.connect()
        async with self.pool.connection() as conn:
            await register_vector_async(conn)
            yield conn


# Global database connection instance
db = DatabaseConnection()
