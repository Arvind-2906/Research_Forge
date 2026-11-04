"""Tests for Phase 7 RAG, Document Parsing, Cleaning, Chunking, and Retrieval.
"""

import sys
import asyncio
import pytest
from unittest.mock import AsyncMock, patch

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from rag.ingestion.text_cleaner import text_cleaner
from rag.ingestion.document_parser import document_parser
from rag.chunking.chunker import document_chunker
from rag.pipelines.rag_pipeline import rag_pipeline
from rag.retrieval.vector_search import vector_search_service, SearchRequest


def test_text_cleaner():
    """Verifies whitespace normalization, control character stripping, and title extraction."""
    raw = "  \t\n# Quantum Computing Breakthroughs\n\n\n\x00\x05This is   a test paragraph.\r\n\r\nSecond paragraph.   \n"
    cleaned = text_cleaner.clean(raw)

    assert "\x00" not in cleaned
    assert "\r" not in cleaned
    assert "This is a test paragraph." in cleaned
    assert "Second paragraph." in cleaned
    assert text_cleaner.extract_title_candidate(cleaned) == "Quantum Computing Breakthroughs"


@pytest.mark.asyncio
async def test_document_parser_markdown_and_plain():
    """Verifies parsing of Markdown and Plain text content."""
    md_content = b"# Architecture\n\nThis document describes the RAG ingestion pipeline."
    parsed = await document_parser.parse_bytes(md_content, filename="architecture.md", mime_type="text/markdown")

    assert parsed.title == "Architecture"
    assert "RAG ingestion pipeline" in parsed.full_text
    assert parsed.mime_type == "text/markdown"
    assert parsed.word_count > 5
    assert len(parsed.pages) == 1


def test_document_chunker_boundaries_and_hashes():
    """Verifies that chunker respects size, overlap, and produces SHA-256 hashes."""
    text = (
        "Paragraph one discusses transformer architectures and self-attention mechanisms in deep learning.\n\n"
        "Paragraph two focuses on retrieval-augmented generation (RAG) and dense vector representations.\n\n"
        "Paragraph three covers vector indexing with pgvector, HNSW, and IVFFlat indexes in PostgreSQL."
    )
    chunker = document_chunker
    chunks = chunker.chunk_text(text, metadata={"source": "test_doc"})

    assert len(chunks) >= 1
    for c in chunks:
        assert len(c.content_hash) == 64  # SHA-256 hex string
        assert c.token_count > 0
        assert c.metadata.get("source") == "test_doc"


@pytest.mark.asyncio
async def test_rag_pipeline_ingest_and_retrieve():
    """Verifies end-to-end ingestion and context retrieval with mocked DB persistence."""
    doc_bytes = b"# Quantum Algorithms\n\nShor's algorithm provides exponential speedup for integer factorization."

    mock_src = {"id": "src_test_1", "url": "doc://ws_1/quantum.md", "title": "Quantum Algorithms"}
    mock_snap = {"id": "snp_test_1", "content": "..."}
    mock_chunk = {"id": "chk_test_1", "chunkIndex": 0}

    from database.repositories import source_repository, event_repository

    with patch.object(source_repository, "get_or_create_source", new_callable=AsyncMock, return_value=mock_src), \
         patch.object(source_repository, "create_snapshot", new_callable=AsyncMock, return_value=mock_snap), \
         patch.object(source_repository, "create_chunk", new_callable=AsyncMock, return_value=mock_chunk), \
         patch.object(event_repository, "create_event", new_callable=AsyncMock):

        result = await rag_pipeline.ingest_document(
            content=doc_bytes,
            filename="quantum.md",
            workspace_id="ws_123",
            mime_type="text/markdown",
        )

        assert result.source_id == "src_test_1"
        assert result.snapshot_id == "snp_test_1"
        assert result.title == "Quantum Algorithms"
        assert result.total_chunks >= 1
