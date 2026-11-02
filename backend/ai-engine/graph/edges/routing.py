"""ResearchForge AI Engine - LangGraph Conditional Edges.

Implements deterministic routing functions for plan approval, research loops,
and report quality finalization.
"""

from typing import Literal
from langgraph.graph import END
from graph.state.state import ResearchState
from utils.logger import logger


def route_after_planning(state: ResearchState) -> str:
    """Routes to approval check or directly to coordinator."""
    requires_approval = state.get("requires_approval", False)
    plan_approved = state.get("plan_approved", False)

    if requires_approval and not plan_approved:
        logger.info("[Routing] Plan requires user approval - interrupting workflow")
        return "plan_approval_gate"

    logger.info("[Routing] Plan approved (or auto-approved) - proceeding to coordinator")
    return "coordinator"


def route_after_gap_analysis(state: ResearchState) -> str:
    """Evaluates whether another research loop is needed or to proceed to synthesis."""
    gaps = state.get("research_gaps", [])
    current_iter = state.get("research_iterations", 1)
    max_iter = state.get("max_iterations", 2)

    if gaps and current_iter < max_iter:
        logger.info(f"[Routing] Gaps detected ({len(gaps)}) and iteration {current_iter} < {max_iter}. Looping back to web_research.")
        return "web_research"

    logger.info(f"[Routing] Research complete (iteration {current_iter}/{max_iter}). Proceeding to synthesis.")
    return "synthesis"


def route_after_quality_review(state: ResearchState) -> str:
    """Determines if report is final or requires conclusion."""
    review = state.get("quality_review", {})
    passed = review.get("passed", True)

    if passed:
        logger.info("[Routing] Quality review passed. Finalizing research workflow.")
    else:
        logger.warning(f"[Routing] Quality review scored {review.get('score')}/100. Concluding with review notes.")

    return END

