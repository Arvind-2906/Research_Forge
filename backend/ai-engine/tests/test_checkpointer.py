"""Tests for LangGraph PostgreSQL Checkpointer.
"""

import sys
import asyncio
import pytest

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from graph.checkpointer import checkpoint_manager


@pytest.mark.asyncio
async def test_checkpointer_lifecycle():
    """Verifies that checkpoint state can be saved and retrieved from Neon PostgreSQL."""
    thread_id = "test_cp_thread_phase4"
    config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}}

    checkpoint = {
        "v": 1,
        "id": "00000000-0000-0000-0000-000000000042",
        "ts": "2026-11-01T14:00:00Z",
        "channel_values": {"current_node": "planning_agent", "iteration": 1},
        "channel_versions": {"current_node": 1, "iteration": 1},
        "versions_seen": {},
    }
    metadata = {"source": "unit_test", "step": 1, "writes": {}}

    async with checkpoint_manager.get_checkpointer() as checkpointer:
        saved_config = await checkpointer.aput(config, checkpoint, metadata, {})
        assert saved_config is not None

        retrieved = await checkpointer.aget(config)
        assert retrieved is not None
        assert retrieved["channel_values"]["current_node"] == "planning_agent"
        assert retrieved["channel_values"]["iteration"] == 1

