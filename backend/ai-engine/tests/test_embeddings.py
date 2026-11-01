"""Tests for Embedding Service & Vector Fallback.
"""

import sys
import asyncio
import pytest

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from embeddings.embedding_service import embedding_service


@pytest.mark.asyncio
async def test_embed_single_query():
    """Verifies that single query embedding generates a valid 384-dimensional vector."""
    query = "Autonomous agent research and retrieval augmented generation"
    vec = await embedding_service.embed_query(query)

    assert isinstance(vec, list)
    assert len(vec) == 384
    # Check that it's normalized (sum of squares is close to 1.0)
    norm = sum(v * v for v in vec)
    assert 0.98 <= norm <= 1.02


@pytest.mark.asyncio
async def test_batch_embed_documents():
    """Verifies that batch document embedding returns 384 dimensions for each item."""
    docs = [
        "First document about artificial intelligence and robotics.",
        "Second document detailing renewable solar energy storage.",
        "Third document on distributed systems and consensus protocols.",
    ]
    vectors = await embedding_service.embed_documents(docs)

    assert len(vectors) == 3
    for vec in vectors:
        assert len(vec) == 384
        norm = sum(v * v for v in vec)
        assert 0.98 <= norm <= 1.02


def test_cosine_similarity():
    """Verifies cosine similarity calculations."""
    vec_a = [1.0, 0.0] + [0.0] * 382
    vec_b = [1.0, 0.0] + [0.0] * 382
    vec_c = [0.0, 1.0] + [0.0] * 382

    sim_identical = embedding_service.cosine_similarity(vec_a, vec_b)
    sim_orthogonal = embedding_service.cosine_similarity(vec_a, vec_c)

    assert pytest.approx(sim_identical, 0.01) == 1.0
    assert pytest.approx(sim_orthogonal, 0.01) == 0.0

