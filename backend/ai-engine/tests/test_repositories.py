"""Tests for AI Engine Repositories against Neon PostgreSQL.
"""

import sys
import asyncio
import pytest

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from database.repositories import (
    run_repository,
    event_repository,
    source_repository,
    claim_repository,
)


def test_url_canonicalization():
    """Verifies URL canonicalization, hashing, and domain extraction."""
    url = "HTTPS://WWW.Arxiv.org/abs/2301.00001/?format=pdf"
    canonical, url_hash, domain = source_repository.canonicalize_url(url)

    assert canonical == "https://www.arxiv.org/abs/2301.00001?format=pdf"
    assert domain == "www.arxiv.org"
    assert len(url_hash) == 64


@pytest.mark.asyncio
async def test_repository_read_queries():
    """Verifies that repository queries execute successfully against live Neon DB."""
    # Test reading non-existent entities
    run = await run_repository.get_run("non_existent_id")
    assert run is None

    plan = await run_repository.get_latest_plan("non_existent_id")
    assert plan is None

    events = await event_repository.get_events_for_run("non_existent_id")
    assert isinstance(events, list)
    assert len(events) == 0

    claims = await claim_repository.get_claims_with_evidence("non_existent_id")
    assert isinstance(claims, list)
    assert len(claims) == 0

    # Search with dummy 384-d vector
    dummy_vector = [0.0] * 384
    dummy_vector[0] = 1.0
    chunks = await source_repository.search_similar_chunks(dummy_vector, run_id="non_existent_id")
    assert isinstance(chunks, list)
    assert len(chunks) == 0

