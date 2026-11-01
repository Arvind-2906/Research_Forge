"""ResearchForge AI Engine - LangGraph PostgreSQL Checkpointer.

Provides checkpoint persistence for LangGraph multi-agent workflows using
Neon PostgreSQL tables (checkpoints, checkpoint_blobs, checkpoint_writes).
"""

import sys
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

# On Windows, psycopg async requires the WindowsSelectorEventLoopPolicy
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from config.settings import get_settings
from utils.logger import logger


class CheckpointManager:
    """Manages LangGraph AsyncPostgresSaver connections and setup."""

    def __init__(self, conn_string: str | None = None):
        self.settings = get_settings()
        self.conn_string = conn_string or self.settings.DATABASE_URL
        self._is_setup = False

    async def setup(self):
        """Initializes checkpoint tables if needed (idempotent)."""
        if self._is_setup:
            return
        try:
            logger.info("[Checkpointer] Verifying LangGraph PostgreSQL checkpoint schema...")
            async with AsyncPostgresSaver.from_conn_string(self.conn_string) as saver:
                await saver.setup()
            self._is_setup = True
            logger.info("[Checkpointer] LangGraph PostgreSQL checkpoint schema verified.")
        except Exception as e:
            logger.error(f"[Checkpointer Error] Failed to setup checkpointer tables: {e}")
            raise

    @asynccontextmanager
    async def get_checkpointer(self) -> AsyncGenerator[AsyncPostgresSaver, None]:
        """Async context manager that yields an active AsyncPostgresSaver instance."""
        async with AsyncPostgresSaver.from_conn_string(self.conn_string) as saver:
            yield saver


# Global checkpointer manager instance
checkpoint_manager = CheckpointManager()

