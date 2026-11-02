"""ResearchForge AI Engine - Verification Graph Nodes.

LangGraph node functions for Claim Verification, Contradiction Detection,
and Research Gap Analysis agents.
"""

from typing import Dict, Any, List
from graph.state.state import ResearchState
from agents.verification import verification_agent, contradiction_agent, gap_analysis_agent
from utils.logger import logger


async def verification_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Rigorously verifies claims against evidence quotes."""
    run_id = state.get("run_id", "default_run")
    claims = state.get("claims", [])
    evidence = state.get("evidence", [])

    logger.info(f"[GraphNode:Verification] Verifying claims for run {run_id}")

    # Pair claims with their evidence
    evidence_by_claim: Dict[str, Dict[str, Any]] = {}
    for ev in evidence:
        cid = ev.get("claim_id")
        if cid and cid not in evidence_by_claim:
            evidence_by_claim[cid] = ev

    pairs = []
    for c in claims:
        cid = c.get("claim_id")
        ev = evidence_by_claim.get(cid, {})
        pairs.append({
            "claim_id": cid,
            "claim_text": c.get("claim_text"),
            "quote": ev.get("quote", ""),
            "source_url": c.get("source_url") or ev.get("source_url", ""),
        })

    output = await verification_agent.run(run_id=run_id, claims_with_evidence=pairs)

    verification_results = [v.model_dump() for v in output.evaluations]

    return {
        "verification_results": verification_results,
        "current_phase": "CLAIM_VERIFICATION",
        "current_status": "CLAIMS_VERIFIED",
        "active_agents": ["VerificationAgent"],
    }


async def contradiction_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Detects contradictory claims and diverging metrics."""
    run_id = state.get("run_id", "default_run")
    claims = state.get("claims", [])

    logger.info(f"[GraphNode:Contradiction] Checking contradictions for run {run_id}")
    output = await contradiction_agent.run(run_id=run_id, claims=claims)

    contradictions = [item.model_dump() for item in output.items]

    return {
        "contradictions": contradictions,
        "current_phase": "CONTRADICTION_DETECTION",
        "current_status": "CONTRADICTIONS_ANALYZED",
        "active_agents": ["ContradictionAgent"],
    }


async def gap_analysis_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Assesses completeness and determines if another research iteration is needed."""
    run_id = state.get("run_id", "default_run")
    query = state.get("research_query", "")
    plan = state.get("research_plan", {})
    dimensions = plan.get("dimensions", ["General Overview"])
    claims = state.get("claims", [])
    current_iter = state.get("research_iterations", 1)
    max_iter = state.get("max_iterations", 2)

    logger.info(f"[GraphNode:GapAnalysis] Assessing gaps for run {run_id} (iteration {current_iter}/{max_iter})")
    output = await gap_analysis_agent.run(
        run_id=run_id,
        research_query=query,
        dimensions=dimensions,
        verified_claims=claims,
        current_iteration=current_iter,
        max_iterations=max_iter,
    )

    update: Dict[str, Any] = {
        "research_gaps": output.identified_gaps,
        "current_phase": "GAP_ANALYSIS",
        "current_status": "GAP_ANALYSIS_COMPLETED",
        "active_agents": ["GapAnalysisAgent"],
    }

    if output.needs_more_research and output.follow_up_queries:
        update["search_queries"] = output.follow_up_queries

    return update

