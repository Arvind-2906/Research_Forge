"""ResearchForge AI Engine - Web Research Agent.

Executes search queries across Tavily and Exa providers, deduplicates URLs,
extracts source metadata, and persists discovered sources in Neon PostgreSQL.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from mcp.manager import mcp_manager
from database.repositories import source_repository, event_repository
from utils.logger import logger


class DiscoveredSourceItem(BaseModel):
    url: str
    title: Optional[str] = None
    snippet: Optional[str] = None
    author: Optional[str] = None
    published_date: Optional[str] = None
    score: Optional[float] = None
    provider: str = "web_search"


class WebResearchOutput(BaseModel):
    queries_executed: List[str]
    total_discovered: int
    sources: List[DiscoveredSourceItem]


class WebResearchAgent:
    """Agent responsible for multi-source web discovery and deduplication."""

    async def run(
        self,
        run_id: str,
        queries: List[str],
        workspace_id: Optional[str] = None,
        max_results_per_query: int = 5,
    ) -> WebResearchOutput:
        """Executes search queries, deduplicates results, and persists sources."""
        logger.info(f"[WebResearchAgent] Running discovery with {len(queries)} queries for run {run_id}")
        discovered_by_url: Dict[str, DiscoveredSourceItem] = {}
        executed_queries: List[str] = []

        # Make sure MCP manager is ready
        await mcp_manager.initialize()

        for query in queries[:8]:  # Limit to max 8 queries per research cycle to preserve budget
            query_str = query.strip()
            if not query_str:
                continue

            executed_queries.append(query_str)
            logger.info(f"[WebResearchAgent] Executing query: '{query_str}'")

            # Try Tavily first
            resp = await mcp_manager.invoke_tool(
                tool_name="tavily_search",
                arguments={"query": query_str, "max_results": max_results_per_query},
                run_id=run_id,
                workspace_id=workspace_id,
            )

            results = []
            if resp.status == "COMPLETED" and isinstance(resp.result, dict):
                results = resp.result.get("results", [])
            elif resp.status != "COMPLETED":
                # Fallback to Exa if Tavily fails or is unavailable
                logger.warning(f"[WebResearchAgent] Tavily search issue ({resp.error}), falling back to Exa")
                exa_resp = await mcp_manager.invoke_tool(
                    tool_name="exa_search",
                    arguments={"query": query_str, "num_results": max_results_per_query},
                    run_id=run_id,
                    workspace_id=workspace_id,
                )
                if exa_resp.status == "COMPLETED" and isinstance(exa_resp.result, dict):
                    results = exa_resp.result.get("results", [])

            for item in results:
                url = item.get("url")
                if not url:
                    continue
                canonical_url, _, _ = source_repository.canonicalize_url(url)
                if canonical_url not in discovered_by_url:
                    discovered_by_url[canonical_url] = DiscoveredSourceItem(
                        url=canonical_url,
                        title=item.get("title") or item.get("url"),
                        snippet=item.get("content") or item.get("snippet") or item.get("text"),
                        author=item.get("author"),
                        published_date=item.get("published_date") or item.get("publishedDate"),
                        score=item.get("score"),
                        provider="tavily" if "score" in item else "exa",
                    )

        # Persist discovered sources in Neon PostgreSQL if workspace_id is provided
        sources_list = list(discovered_by_url.values())
        if workspace_id:
            for s in sources_list:
                try:
                    db_src = await source_repository.get_or_create_source(
                        workspace_id=workspace_id,
                        url=s.url,
                        title=s.title,
                        author=s.author,
                        source_type="WEB",
                        metadata={"provider": s.provider, "snippet": s.snippet, "score": s.score},
                    )
                    await source_repository.link_run_source(
                        run_id=run_id,
                        source_id=db_src["id"],
                        discovery_order=len(discovered_by_url),
                        relevance_score=s.score,
                    )
                except Exception as e:
                    logger.warning(f"[WebResearchAgent] Failed to persist source {s.url}: {e}")

        # Emit audit event
        await event_repository.create_event(
            run_id=run_id,
            event_type="SOURCES_DISCOVERED",
            message=f"Discovered {len(sources_list)} unique sources across {len(executed_queries)} queries",
            agent_name="WebResearchAgent",
            payload={"queries_count": len(executed_queries), "sources_count": len(sources_list)},
        )

        return WebResearchOutput(
            queries_executed=executed_queries,
            total_discovered=len(sources_list),
            sources=sources_list,
        )


web_research_agent = WebResearchAgent()

