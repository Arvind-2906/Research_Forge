"""ResearchForge AI Engine - Discovery Graph Nodes.

LangGraph node functions for Web Research and Document Research agents.
"""

from typing import Dict, Any, List
from graph.state.state import ResearchState
from agents.discovery import web_research_agent, document_research_agent
from utils.logger import logger


async def web_research_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Executes parallel web search queries and deduplicates discovered sources."""
    run_id = state.get("run_id", "default_run")
    workspace_id = state.get("workspace_id")
    queries = state.get("search_queries", [])

    if not queries:
        queries = [state.get("research_query", "")]

    logger.info(f"[GraphNode:WebResearch] Executing search for {len(queries)} queries (run {run_id})")
    output = await web_research_agent.run(
        run_id=run_id,
        queries=queries,
        workspace_id=workspace_id,
        max_results_per_query=5,
    )

    discovered_sources = [s.model_dump() for s in output.sources]

    return {
        "discovered_sources": discovered_sources,
        "current_phase": "SOURCE_DISCOVERY",
        "current_status": "SOURCES_DISCOVERED",
        "active_agents": ["WebResearchAgent"],
    }


async def document_research_node(state: ResearchState) -> Dict[str, Any]:
    """LangGraph node: Searches internal workspace documents and vector chunks."""
    run_id = state.get("run_id", "default_run")
    workspace_id = state.get("workspace_id")
    query = state.get("research_query", "")

    logger.info(f"[GraphNode:DocumentResearch] Searching workspace documents for run {run_id}")
    output = await document_research_agent.run(
        run_id=run_id,
        query=query,
        workspace_id=workspace_id,
        limit=5,
    )

    chunks = [c.model_dump() for c in output.chunks]

    return {
        "source_chunks": chunks,
        "current_phase": "DOCUMENT_DISCOVERY",
        "current_status": "DOCUMENTS_RETRIEVED",
        "active_agents": ["DocumentResearchAgent"],
    }

