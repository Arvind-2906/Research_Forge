"""ResearchForge AI Engine - Reporting Graph Nodes.

LangGraph node functions for Report Generation and Quality Review agents.
"""

from typing import Dict, Any, List
from graph.state.state import ResearchState
from agents.reporting import report_generation_agent, quality_review_agent
from database.repositories import run_repository
from utils.logger import logger


async def report_generation_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Assembles the final Markdown research report and saves to DB."""
    run_id = state.get("run_id", "default_run")
    query = state.get("research_query", "")
    spec = state.get("research_specification", {})
    synthesis = state.get("synthesis", {})
    citations = state.get("citations", [])
    contradictions = state.get("contradictions", [])

    logger.info(f"[GraphNode:ReportGeneration] Compiling final report for run {run_id}")
    report_result = await report_generation_agent.run(
        run_id=run_id,
        research_query=query,
        specification=spec,
        synthesis=synthesis,
        citations=citations,
        contradictions=contradictions,
    )

    return {
        "report": report_result.model_dump(),
        "current_phase": "REPORT_GENERATION",
        "current_status": "REPORT_GENERATED",
        "active_agents": ["ReportGenerationAgent"],
    }


async def quality_review_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Conducts QA on report and finishes the research run."""
    run_id = state.get("run_id", "default_run")
    query = state.get("research_query", "")
    report = state.get("report", {})
    md_content = report.get("markdown_content", "")
    citation_count = report.get("citation_count", 0)

    logger.info(f"[GraphNode:QualityReview] Quality reviewing report for run {run_id}")
    review_output = await quality_review_agent.run(
        run_id=run_id,
        research_query=query,
        report_markdown=md_content,
        citation_count=citation_count,
    )

    review_dict = review_output.model_dump()

    # Update run status to COMPLETED if passed
    if review_output.passed:
        await run_repository.update_status(run_id=run_id, status="COMPLETED")

    return {
        "quality_review": review_dict,
        "current_phase": "QUALITY_REVIEW",
        "current_status": "COMPLETED" if review_output.passed else "REVIEW_NEEDS_REVISION",
        "active_agents": ["QualityReviewAgent"],
    }

