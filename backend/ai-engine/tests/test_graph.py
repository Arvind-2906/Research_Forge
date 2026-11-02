"""Tests for Phase 6 LangGraph Architecture, Nodes, Edges, and Execution.
"""

import sys
import asyncio
import pytest
from unittest.mock import AsyncMock, patch
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from graph.graph_builder import graph_builder, GraphBuilder
from graph.workflows.research_workflow import create_research_workflow
from graph.edges.routing import (
    route_after_planning,
    route_after_gap_analysis,
    route_after_quality_review,
)
from graph.nodes import (
    intake_node,
    planner_node,
    coordinator_node,
    gap_analysis_node,
    quality_review_node,
)
from graph.state.state import ResearchState
from agents.planning import intake_agent, coordinator_agent
from agents.planning.intake_agent import ResearchSpecification
from agents.planning.planner_agent import ResearchPlanOutput, TaskPlanItem
from agents.verification.gap_analysis_agent import GapAnalysisOutput
from agents.reporting.quality_review_agent import QualityReviewOutput


def test_graph_builder_compilation():
    """Verifies that GraphBuilder successfully constructs and compiles the state graph."""
    builder = GraphBuilder()
    compiled = builder.build()
    assert compiled is not None

    # Test with MemorySaver checkpointer
    memory_checkpointer = MemorySaver()
    compiled_with_cp = builder.build(checkpointer=memory_checkpointer)
    assert compiled_with_cp is not None


def test_routing_after_planning():
    """Verifies routing logic for human-in-the-loop plan approval."""
    # Scenario 1: Requires approval and not approved -> approval gate
    state1: ResearchState = {
        "requires_approval": True,
        "plan_approved": False,
    }
    assert route_after_planning(state1) == "plan_approval_gate"

    # Scenario 2: Requires approval and approved -> coordinator
    state2: ResearchState = {
        "requires_approval": True,
        "plan_approved": True,
    }
    assert route_after_planning(state2) == "coordinator"

    # Scenario 3: Auto-approved -> coordinator
    state3: ResearchState = {
        "requires_approval": False,
        "plan_approved": True,
    }
    assert route_after_planning(state3) == "coordinator"


def test_routing_after_gap_analysis():
    """Verifies loop control routing after gap analysis."""
    # Scenario 1: Gaps found, under max iterations -> web_research
    state1: ResearchState = {
        "research_gaps": ["Missing data on qubit fidelity"],
        "research_iterations": 1,
        "max_iterations": 2,
    }
    assert route_after_gap_analysis(state1) == "web_research"

    # Scenario 2: Gaps found, but max iterations reached -> synthesis
    state2: ResearchState = {
        "research_gaps": ["Missing data on qubit fidelity"],
        "research_iterations": 2,
        "max_iterations": 2,
    }
    assert route_after_gap_analysis(state2) == "synthesis"

    # Scenario 3: No gaps found -> synthesis
    state3: ResearchState = {
        "research_gaps": [],
        "research_iterations": 1,
        "max_iterations": 2,
    }
    assert route_after_gap_analysis(state3) == "synthesis"


def test_routing_after_quality_review():
    """Verifies workflow finalization after quality review."""
    state: ResearchState = {
        "quality_review": {"passed": True, "score": 92},
    }
    assert route_after_quality_review(state) == END


@pytest.mark.asyncio
async def test_intake_node_execution():
    """Verifies intake_node transforms query to ResearchSpecification."""
    mock_spec = ResearchSpecification(
        objective="Analyze AI agent architectures",
        topic="AI Agents",
        domain="Computer Science",
        scope="Autonomous research systems",
        depth="in-depth",
        expected_format="Structured report",
        constraints=["Focus on LangGraph"],
        search_keywords=["LangGraph agents", "multi-agent workflows"],
    )

    state: ResearchState = {
        "research_query": "Explain AI agent architectures in LangGraph",
    }

    with patch.object(intake_agent, "run", new_callable=AsyncMock, return_value=mock_spec):
        update = await intake_node(state)
        assert update["current_phase"] == "PLANNING"
        assert update["current_status"] == "SPECIFIED"
        assert update["research_specification"]["topic"] == "AI Agents"
        assert len(update["search_queries"]) == 2


@pytest.mark.asyncio
async def test_coordinator_node_execution():
    """Verifies coordinator_node initializes tasks and increments iterations."""
    state: ResearchState = {
        "run_id": "run_123",
        "tasks": [{"id": "t1", "title": "Web Search", "tool_required": "web_search", "depends_on": []}],
        "research_iterations": 0,
    }

    mock_initialized = [
        {"id": "db_t1", "title": "Web Search", "assignedAgent": "web_search", "status": "PENDING"}
    ]

    with patch.object(coordinator_agent, "initialize_tasks", new_callable=AsyncMock, return_value=mock_initialized):
        update = await coordinator_node(state)
        assert update["current_phase"] == "DISCOVERY"
        assert update["current_status"] == "TASKS_SCHEDULED"
        assert update["research_iterations"] == 1
        assert len(update["tasks"]) == 1
