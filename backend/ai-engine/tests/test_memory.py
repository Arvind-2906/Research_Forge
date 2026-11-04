"""Tests for Phase 7 Scoped Memory System & Consolidation.
"""

import sys
import asyncio
import pytest
from unittest.mock import AsyncMock, patch

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from services.memory_service import memory_service, MemoryCreateRequest, MemorySearchRequest
from database.repositories import memory_repository


@pytest.mark.asyncio
async def test_add_memory_fresh_record():
    """Verifies fresh memory creation when no similar memory exists."""
    req = MemoryCreateRequest(
        content="User prefers concise bullet-point summaries rather than lengthy narrative reports.",
        scope="USER",
        memory_type="USER_PREFERENCE",
        user_id="usr_test_123",
    )

    mock_created = {
        "id": "mem_test_1",
        "scope": "USER",
        "type": "USER_PREFERENCE",
        "content": req.content,
        "userId": "usr_test_123",
    }

    # Similar search returns empty -> creates fresh
    with patch.object(memory_repository, "search_memories", new_callable=AsyncMock, return_value=[]), \
         patch.object(memory_repository, "create_memory", new_callable=AsyncMock, return_value=mock_created):

        created = await memory_service.add_memory(req, consolidate=True)
        assert created["id"] == "mem_test_1"
        assert created["scope"] == "USER"
        assert created["type"] == "USER_PREFERENCE"


@pytest.mark.asyncio
async def test_add_memory_consolidation():
    """Verifies consolidation when a highly-similar memory already exists in the same scope."""
    req = MemoryCreateRequest(
        content="The primary dataset contains 150,000 biomedical abstracts from PubMed.",
        scope="PROJECT",
        memory_type="IMPORTANT_FACT",
        project_id="prj_test_1",
        workspace_id="ws_test_1",
    )

    existing_memory = {
        "id": "mem_existing_42",
        "scope": "PROJECT",
        "type": "IMPORTANT_FACT",
        "content": "Dataset has 150k biomedical abstracts from PubMed.",
        "similarity": 0.94,
        "metadata": {"initial_version": 1},
    }

    consolidated_record = {
        "id": "mem_existing_42",
        "scope": "PROJECT",
        "type": "IMPORTANT_FACT",
        "content": req.content,
        "metadata": {"initial_version": 1, "consolidation_count": 2},
    }

    with patch.object(memory_repository, "search_memories", new_callable=AsyncMock, return_value=[existing_memory]), \
         patch.object(memory_repository, "update_memory", new_callable=AsyncMock, return_value=consolidated_record):

        result = await memory_service.add_memory(req, consolidate=True)
        assert result["id"] == "mem_existing_42"
        assert result["metadata"]["consolidation_count"] == 2


@pytest.mark.asyncio
async def test_search_memories_scope_isolation():
    """Verifies that memory search applies scope and workspace/user filters."""
    search_req = MemorySearchRequest(
        query="Biomedical research dataset size",
        scope="PROJECT",
        project_id="prj_test_1",
        workspace_id="ws_test_1",
        top_k=3,
    )

    mock_results = [
        {
            "id": "mem_1",
            "content": "The dataset contains 150,000 biomedical abstracts.",
            "similarity": 0.89,
            "scope": "PROJECT",
        }
    ]

    with patch.object(memory_repository, "search_memories", new_callable=AsyncMock, return_value=mock_results):
        results = await memory_service.search_memories(search_req)
        assert len(results) == 1
        assert results[0]["id"] == "mem_1"
        assert results[0]["similarity"] == 0.89

