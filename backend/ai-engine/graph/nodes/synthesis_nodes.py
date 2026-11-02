"""ResearchForge AI Engine - Synthesis Graph Nodes.

LangGraph node functions for Research Synthesis and Citation Validation agents.
"""

from typing import Dict, Any, List
from graph.state.state import ResearchState
from agents.synthesis import synthesis_agent, citation_validation_agent
from utils.logger import logger


async def synthesis_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Combines verified claims into cohesive analytical sections."""
    run_id = state.get("run_id", "default_run")
    query = state.get("research_query", "")
    plan = state.get("research_plan", {})
    dimensions = plan.get("dimensions", ["Key Findings"])
    claims = state.get("claims", [])
    contradictions = state.get("contradictions", [])

    logger.info(f"[GraphNode:Synthesis] Synthesizing report sections for run {run_id}")
    output = await synthesis_agent.run(
        run_id=run_id,
        research_query=query,
        dimensions=dimensions,
        verified_claims=claims,
        contradictions=contradictions,
    )

    return {
        "synthesis": output.model_dump(),
        "current_phase": "RESEARCH_SYNTHESIS",
        "current_status": "SYNTHESIS_COMPLETED",
        "active_agents": ["SynthesisAgent"],
    }


async def citation_validation_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Validates and renumbers citations against empirical evidence."""
    run_id = state.get("run_id", "default_run")
    synthesis = state.get("synthesis", {})
    sections = synthesis.get("sections", [])
    evidence = state.get("evidence", [])
    sources = state.get("extracted_sources", []) or state.get("discovered_sources", [])

    logger.info(f"[GraphNode:CitationValidation] Validating citation references for run {run_id}")
    output = await citation_validation_agent.run(
        run_id=run_id,
        synthesis_sections=sections,
        evidence_pool=evidence,
        sources_pool=sources,
    )

    citations = [c.model_dump() for c in output.citations]

    return {
        "citations": citations,
        "current_phase": "CITATION_VALIDATION",
        "current_status": "CITATIONS_VALIDATED",
        "active_agents": ["CitationValidationAgent"],
    }

