"""ResearchForge AI Engine - Source Extraction Agent.

Extracts and cleans full content from discovered sources using Firecrawl MCP
or cached search snippets, creating persistent SourceSnapshots.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from mcp.manager import mcp_manager
from database.repositories import source_repository, event_repository
from utils.logger import logger


class ExtractedSourceItem(BaseModel):
    url: str
    title: str
    content: str
    author: Optional[str] = None
    publish_date: Optional[str] = None
    snapshot_id: Optional[str] = None
    word_count: int = 0


class SourceExtractionOutput(BaseModel):
    total_extracted: int
    extracted_sources: List[ExtractedSourceItem]


class SourceExtractionAgent:
    """Agent that ingests, cleans, and snapshots discovered web sources."""

    async def run(
        self,
        run_id: str,
        sources: List[Dict[str, Any]],
        workspace_id: Optional[str] = None,
        max_extract: int = 6,
    ) -> SourceExtractionOutput:
        """Extracts deep content for top sources and creates database snapshots."""
        logger.info(f"[SourceExtractionAgent] Extracting content for up to {max_extract} sources (run {run_id})")
        extracted_items: List[ExtractedSourceItem] = []

        await mcp_manager.initialize()

        for s in sources[:max_extract]:
            url = s.get("url")
            if not url:
                continue

            content = ""
            title = s.get("title") or url
            author = s.get("author")
            publish_date = s.get("published_date")

            # Try deep scraping with Firecrawl MCP if URL is HTTP/HTTPS
            if url.startswith("http://") or url.startswith("https://"):
                try:
                    scrape_resp = await mcp_manager.invoke_tool(
                        tool_name="firecrawl_scrape",
                        arguments={"url": url, "formats": ["markdown"]},
                        run_id=run_id,
                        workspace_id=workspace_id,
                    )
                    if scrape_resp.status == "COMPLETED" and isinstance(scrape_resp.result, dict):
                        content = scrape_resp.result.get("markdown") or scrape_resp.result.get("text") or ""
                        meta = scrape_resp.result.get("metadata", {})
                        if not author and meta.get("author"):
                            author = meta.get("author")
                        if not publish_date and meta.get("publishedDate"):
                            publish_date = meta.get("publishedDate")
                except Exception as e:
                    logger.debug(f"[SourceExtractionAgent] Firecrawl scrape failed for {url}: {e}")

            # Fallback to search snippet if Firecrawl returned empty or errored
            if not content:
                content = s.get("snippet") or s.get("text") or ""

            if not content.strip():
                continue

            # Clean and truncate content if overly verbose
            cleaned_content = content.strip()[:15000]
            words = len(cleaned_content.split())

            snapshot_id = None
            if workspace_id:
                try:
                    # Look up source record to attach snapshot
                    canonical_url, _, _ = source_repository.canonicalize_url(url)
                    db_src = await source_repository.get_or_create_source(
                        workspace_id=workspace_id,
                        url=canonical_url,
                        title=title,
                        author=author,
                    )
                    snapshot = await source_repository.create_snapshot(
                        source_id=db_src["id"],
                        content=cleaned_content,
                        title=title,
                        author=author,
                        metadata={"word_count": words, "publish_date": publish_date},
                    )
                    snapshot_id = snapshot["id"]
                except Exception as e:
                    logger.warning(f"[SourceExtractionAgent] Error creating snapshot for {url}: {e}")

            extracted_items.append(
                ExtractedSourceItem(
                    url=url,
                    title=title,
                    content=cleaned_content,
                    author=author,
                    publish_date=publish_date,
                    snapshot_id=snapshot_id,
                    word_count=words,
                )
            )

        await event_repository.create_event(
            run_id=run_id,
            event_type="SOURCES_EXTRACTED",
            message=f"Extracted detailed content for {len(extracted_items)} sources",
            agent_name="SourceExtractionAgent",
            payload={"extracted_count": len(extracted_items)},
        )

        return SourceExtractionOutput(
            total_extracted=len(extracted_items),
            extracted_sources=extracted_items,
        )


source_extraction_agent = SourceExtractionAgent()

