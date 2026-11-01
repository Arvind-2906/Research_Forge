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

    async def connect(self):
        """Initializes async connection pool."""
        if self.pool is not None:
            return
        logger.info("[Database] Initializing Neon PostgreSQL async connection pool...")
        # Neon pooler connection parameters
        self.pool = AsyncConnectionPool(
            conninfo=self.database_url,
            min_size=1,
            max_size=10,
            timeout=30.0,
            open=False,
        )
        await self.pool.open()
        # Verify connection
        async with self.pool.connection() as conn:
            await register_vector_async(conn)
            async with conn.cursor() as cur:
                await cur.execute("SELECT 1")
        logger.info("[Database] Neon PostgreSQL async connection pool established and pgvector registered.")

    async def disconnect(self):
        """Closes async connection pool."""
        if self.pool is not None:
            await self.pool.close()
            self.pool = None
            logger.info("[Database] Neon PostgreSQL connection pool closed.")

    async def check_health(self) -> bool:
        """Health check probe."""
        try:
            if self.pool is None:
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
        if self.pool is None:
            await self.connect()
        async with self.pool.connection() as conn:
            await register_vector_async(conn)
            yield conn


# Global database connection instance
db = DatabaseConnection()
