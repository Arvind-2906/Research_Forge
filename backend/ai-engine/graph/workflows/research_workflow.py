"""ResearchForge AI Engine - Research Workflow Construction.

Wires the complete multi-agent LangGraph state machine, including conditional
edges, parallel discovery branches, human approval gates, and research loops.
"""

from typing import Optional, Any
from langgraph.graph import StateGraph, START, END
from graph.state.state import ResearchState
from graph.nodes import (
    intake_node,
    planner_node,
    plan_approval_gate_node,
    coordinator_node,
    web_research_node,
    document_research_node,
    source_extraction_node,
    evidence_extraction_node,
    verification_node,
    contradiction_node,
    gap_analysis_node,
    synthesis_node,
    citation_validation_node,
    report_generation_node,
    quality_review_node,
)
from graph.edges import (
    route_after_planning,
    route_after_gap_analysis,
    route_after_quality_review,
)


def create_research_workflow() -> StateGraph:
    """Creates and returns the uncompiled StateGraph for the research process."""
    workflow = StateGraph(ResearchState)

    # 1. Register all specialized agent nodes
    workflow.add_node("intake", intake_node)
    workflow.add_node("planner", planner_node)
    workflow.add_node("plan_approval_gate", plan_approval_gate_node)
    workflow.add_node("coordinator", coordinator_node)
    workflow.add_node("web_research", web_research_node)
    workflow.add_node("document_research", document_research_node)
    workflow.add_node("source_extraction", source_extraction_node)
    workflow.add_node("evidence_extraction", evidence_extraction_node)
    workflow.add_node("verification", verification_node)
    workflow.add_node("contradiction", contradiction_node)
    workflow.add_node("gap_analysis", gap_analysis_node)
    workflow.add_node("synthesis", synthesis_node)
    workflow.add_node("citation_validation", citation_validation_node)
    workflow.add_node("report_generation", report_generation_node)
    workflow.add_node("quality_review", quality_review_node)

    # 2. Add sequential and branching edges
    # START -> intake -> planner
    workflow.add_edge(START, "intake")
    workflow.add_edge("intake", "planner")

    # Planner -> (conditional: approval gate OR coordinator)
    workflow.add_conditional_edges(
        "planner",
        route_after_planning,
        {
            "plan_approval_gate": "plan_approval_gate",
            "coordinator": "coordinator",
        },
    )

    # Approval gate resumes into coordinator
    workflow.add_edge("plan_approval_gate", "coordinator")

    # Parallel discovery branches: coordinator -> web_research & document_research
    workflow.add_edge("coordinator", "web_research")
    workflow.add_edge("coordinator", "document_research")

    # Convergence from parallel branches into source extraction
    workflow.add_edge("web_research", "source_extraction")
    workflow.add_edge("document_research", "source_extraction")

    # Extraction pipeline
    workflow.add_edge("source_extraction", "evidence_extraction")

    # Verification pipeline
    workflow.add_edge("evidence_extraction", "verification")
    workflow.add_edge("verification", "contradiction")
    workflow.add_edge("contradiction", "gap_analysis")

    # Gap analysis -> (conditional: loop back to web_research OR proceed to synthesis)
    workflow.add_conditional_edges(
        "gap_analysis",
        route_after_gap_analysis,
        {
            "web_research": "web_research",
            "synthesis": "synthesis",
        },
    )

    # Synthesis & reporting pipeline
    workflow.add_edge("synthesis", "citation_validation")
    workflow.add_edge("citation_validation", "report_generation")
    workflow.add_edge("report_generation", "quality_review")

    # Quality review -> conditional finish
    workflow.add_conditional_edges(
        "quality_review",
        route_after_quality_review,
        {
            END: END,
        },
    )

    return workflow

