"""ResearchForge AI Engine - Extraction Graph Nodes.

LangGraph node functions for Source Extraction and Evidence Extraction agents.
"""

from typing import Dict, Any, List
from graph.state.state import ResearchState
from agents.extraction import source_extraction_agent, evidence_extraction_agent
from utils.logger import logger


async def source_extraction_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Ingests, scrapes, and cleans full content from top sources."""
    run_id = state.get("run_id", "default_run")
    workspace_id = state.get("workspace_id")
    discovered = state.get("discovered_sources", [])

    logger.info(f"[GraphNode:SourceExtraction] Extracting content for run {run_id}")
    output = await source_extraction_agent.run(
        run_id=run_id,
        sources=discovered,
        workspace_id=workspace_id,
        max_extract=6,
    )

    extracted_sources = [s.model_dump() for s in output.extracted_sources]

    return {
        "extracted_sources": extracted_sources,
        "current_phase": "SOURCE_EXTRACTION",
        "current_status": "SOURCES_EXTRACTED",
        "active_agents": ["SourceExtractionAgent"],
    }


async def evidence_extraction_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Distills factual claims and quotes from extracted sources."""
    run_id = state.get("run_id", "default_run")
    extracted = state.get("extracted_sources", [])
    query = state.get("research_query", "")

    # Fallback to discovered sources snippets if extracted_sources is empty
    sources_to_use = extracted if extracted else state.get("discovered_sources", [])

    logger.info(f"[GraphNode:EvidenceExtraction] Extracting evidence for run {run_id}")
    output = await evidence_extraction_agent.run(
        run_id=run_id,
        sources=sources_to_use,
        research_query=query,
    )

    claims = []
    evidence = []
    for item in output.items:
        claims.append({
            "claim_id": item.claim_id,
            "claim_text": item.claim_text,
            "confidence": item.confidence,
            "source_url": item.source_url,
            "status": "PENDING",
        })
        evidence.append({
            "evidence_id": item.evidence_id,
            "claim_id": item.claim_id,
            "quote": item.quote,
            "source_url": item.source_url,
            "confidence": item.confidence,
        })

    return {
        "claims": claims,
        "evidence": evidence,
        "current_phase": "EVIDENCE_COLLECTION",
        "current_status": "EVIDENCE_EXTRACTED",
        "active_agents": ["EvidenceExtractionAgent"],
    }

