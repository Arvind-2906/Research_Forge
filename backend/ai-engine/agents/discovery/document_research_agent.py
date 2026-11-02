"""ResearchForge AI Engine - Document Research Agent.

Retrieves and analyzes internal workspace documents and vector chunks.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from embeddings.embedding_service import embedding_service
from database.repositories import source_repository, event_repository
from utils.logger import logger


class DocumentChunkResult(BaseModel):
    chunk_id: str
    source_id: str
    content: str
    distance: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentResearchOutput(BaseModel):
    total_chunks: int
    chunks: List[DocumentChunkResult]


class DocumentResearchAgent:
    """Agent that retrieves and analyzes internal workspace document assets."""

    async def run(
        self,
        run_id: str,
        query: str,
        workspace_id: Optional[str] = None,
        limit: int = 5,
    ) -> DocumentResearchOutput:
        """Embeds the query and performs vector similarity search across workspace source chunks."""
        logger.info(f"[DocumentResearchAgent] Searching workspace documents for query '{query[:60]}'")
        if not workspace_id:
            logger.info("[DocumentResearchAgent] No workspace_id provided; skipping document chunk retrieval")
            return DocumentResearchOutput(total_chunks=0, chunks=[])

        try:
            # 1. Embed search query into 384-d vector
            vector = await embedding_service.embed_query(query)

            # 2. Vector search in Neon pgvector
            chunks = await source_repository.search_similar_chunks(
                workspace_id=workspace_id,
                embedding=vector,
                limit=limit,
            )

            results = [
                DocumentChunkResult(
                    chunk_id=c["id"],
                    source_id=c.get("sourceId", ""),
                    content=c.get("content", ""),
                    distance=float(c.get("distance", 0.0)),
                    metadata=c.get("metadata") or {},
                )
                for c in chunks
            ]

            if results:
                await event_repository.create_event(
                    run_id=run_id,
                    event_type="DOCUMENTS_RETRIEVED",
                    message=f"Retrieved {len(results)} relevant document chunks from workspace knowledge",
                    agent_name="DocumentResearchAgent",
                    payload={"chunk_count": len(results)},
                )

            return DocumentResearchOutput(total_chunks=len(results), chunks=results)

        except Exception as e:
            logger.warning(f"[DocumentResearchAgent] Document search error: {e}")
            return DocumentResearchOutput(total_chunks=0, chunks=[])


document_research_agent = DocumentResearchAgent()

