"""Tests for Phase 6 Research Agents.
"""

import sys
import asyncio
import pytest
from unittest.mock import AsyncMock, patch

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from agents.planning import intake_agent, planner_agent, coordinator_agent
from agents.discovery import web_research_agent, document_research_agent
from agents.extraction import source_extraction_agent, evidence_extraction_agent
from agents.verification import verification_agent, contradiction_agent, gap_analysis_agent
from agents.synthesis import synthesis_agent, citation_validation_agent
from agents.reporting import report_generation_agent, quality_review_agent
from database.repositories import event_repository, report_repository, task_repository
from mcp.manager import mcp_manager
from schemas.mcp import MCPCallResponse


@pytest.mark.asyncio
async def test_coordinator_agent_scheduling():
    """Verifies coordinator agent task dependency scheduling."""
    tasks = [
        {"id": "t1", "title": "Task 1", "depends_on": []},
        {"id": "t2", "title": "Task 2", "depends_on": ["t1"]},
        {"id": "t3", "title": "Task 3", "depends_on": ["t2"]},
    ]

    # Batch 1: Only t1 should be ready
    batch1 = coordinator_agent.schedule_next_batch(tasks, completed_task_ids=set())
    assert len(batch1.ready_tasks) == 1
    assert batch1.ready_tasks[0]["id"] == "t1"
    assert len(batch1.blocked_tasks) == 2
    assert not batch1.all_completed

    # Batch 2: After t1 completes, t2 should be ready
    batch2 = coordinator_agent.schedule_next_batch(tasks, completed_task_ids={"t1"})
    assert len(batch2.ready_tasks) == 1
    assert batch2.ready_tasks[0]["id"] == "t2"
    assert len(batch2.blocked_tasks) == 1

    # Batch 3: After all complete
    batch3 = coordinator_agent.schedule_next_batch(tasks, completed_task_ids={"t1", "t2", "t3"})
    assert len(batch3.ready_tasks) == 0
    assert len(batch3.blocked_tasks) == 0
    assert batch3.all_completed


@pytest.mark.asyncio
async def test_citation_validation_agent():
    """Verifies that citation validation correctly maps evidence tags and resolves URLs."""
    sections = [
        {
            "title": "Quantum Supremacy",
            "content": "Google demonstrated quantum supremacy [Evidence: ev_test_1]. Further experiments confirmed [Evidence: ev_test_2].",
        }
    ]
    evidence_pool = [
        {"evidence_id": "ev_test_1", "claim_id": "clm_1", "source_url": "https://nature.com/articles/s41586"},
        {"evidence_id": "ev_test_2", "claim_id": "clm_2", "source_url": "https://arxiv.org/abs/1910.11333"},
    ]
    sources_pool = [
        {"url": "https://nature.com/articles/s41586", "title": "Quantum Supremacy Using a Programmable Superconducting Processor"},
        {"url": "https://arxiv.org/abs/1910.11333", "title": "Quantum Supremacy Arxiv Preprint"},
    ]

    with patch.object(event_repository, "create_event", new_callable=AsyncMock):
        output = await citation_validation_agent.run(
            run_id="run_test",
            synthesis_sections=sections,
            evidence_pool=evidence_pool,
            sources_pool=sources_pool,
        )

        assert output.is_valid is True
        assert output.total_citations == 2
        assert output.unresolved_citations == 0
        assert output.citations[0].citation_number == 1
        assert output.citations[0].evidence_id == "ev_test_1"
        assert output.citations[1].citation_number == 2
        assert output.citations[1].evidence_id == "ev_test_2"


@pytest.mark.asyncio
async def test_report_generation_agent():
    """Verifies that report generation formats Markdown, citations, and persists."""
    specification = {
        "topic": "Quantum Computing",
        "domain": "Computer Science",
        "scope": "Hardware advances",
        "depth": "in-depth",
    }
    synthesis = {
        "executive_summary": "Quantum computing has achieved significant milestones in error mitigation.",
        "sections": [
            {
                "title": "Hardware Architectures",
                "content": "Superconducting qubits lead current commercial offerings.",
                "key_findings": ["Superconducting qubits show lower latency"],
            }
        ],
    }
    citations = [
        {
            "citation_number": 1,
            "citation_text": "Nature Paper 2024",
            "source_url": "https://example.com/quantum",
        }
    ]

    with patch.object(report_repository, "create_or_update_report", new_callable=AsyncMock) as mock_create_rep, \
         patch.object(report_repository, "create_citations", new_callable=AsyncMock), \
         patch.object(event_repository, "create_event", new_callable=AsyncMock):

        mock_create_rep.return_value = {"id": "rep_test_123", "title": "Quantum Computing Report"}

        output = await report_generation_agent.run(
            run_id="run_test",
            research_query="What is the state of quantum computing?",
            specification=specification,
            synthesis=synthesis,
            citations=citations,
        )

        assert output.report_id == "rep_test_123"
        assert "Quantum Computing" in output.title
        assert "Hardware Architectures" in output.markdown_content
        assert "Executive Summary" in output.markdown_content
        assert output.citation_count == 1
        assert output.word_count > 20


@pytest.mark.asyncio
async def test_web_research_agent_deduplication():
    """Verifies that web research agent deduplicates sources across queries."""
    mock_tavily_resp = MCPCallResponse(
        call_id="call_1",
        status="COMPLETED",
        result={
            "results": [
                {"url": "https://example.com/article", "title": "Article 1", "snippet": "Text 1", "score": 0.9},
                {"url": "https://example.com/article/", "title": "Article 1 Duplicate", "snippet": "Text 1", "score": 0.85},
                {"url": "https://example.org/different", "title": "Article 2", "snippet": "Text 2", "score": 0.95},
            ]
        },
    )

    with patch.object(mcp_manager, "initialize", new_callable=AsyncMock), \
         patch.object(mcp_manager, "invoke_tool", new_callable=AsyncMock, return_value=mock_tavily_resp), \
         patch.object(event_repository, "create_event", new_callable=AsyncMock):

        output = await web_research_agent.run(
            run_id="run_test",
            queries=["quantum computing latest"],
            workspace_id=None,
        )

        assert output.total_discovered == 2  # The duplicate https://example.com/article/ deduplicated
        urls = [s.url for s in output.sources]
        assert "https://example.com/article" in urls
        assert "https://example.org/different" in urls
