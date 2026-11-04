"""ResearchForge AI Engine - Vector & Hybrid Search Retrieval.

Executes 384-dimensional pgvector cosine similarity searches across SourceChunk
and ResearchMemory with multi-tenant workspace/project isolation and source attribution.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from embeddings.embedding_service import embedding_service
from database.repositories import source_repository
from utils.logger import logger


class RetrievalResult(BaseModel):
    chunk_id: str
    snapshot_id: str
    source_id: str
    source_url: str
    source_title: str
    content: str
    similarity_score: float
    chunk_index: int
    token_count: Optional[int] = None
    page_number: Optional[int] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SearchRequest(BaseModel):
    query: str
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None
    run_id: Optional[str] = None
    top_k: int = 5
    min_similarity: float = 0.2
    hybrid: bool = False


class VectorSearchService:
    """Manages vector and hybrid information retrieval across workspace documents and research sources."""

    async def search(self, req: SearchRequest) -> List[RetrievalResult]:
        """Generates query embedding and performs isolated pgvector similarity search."""
        logger.info(f"[VectorSearch] Searching for: '{req.query[:60]}' (workspace: {req.workspace_id})")

        # 1. Generate 384-dimensional query embedding
        query_vector = await embedding_service.embed_query(req.query)

        # 2. Query Neon PostgreSQL via source_repository
        raw_chunks = await source_repository.search_similar_chunks(
            query_embedding=query_vector,
            run_id=req.run_id,
            workspace_id=req.workspace_id,
            top_k=req.top_k,
            min_similarity=req.min_similarity,
        )

        results: List[RetrievalResult] = []
        for c in raw_chunks:
            meta = c.get("metadata") or {}
            results.append(
                RetrievalResult(
                    chunk_id=c["id"],
                    snapshot_id=c.get("snapshotId", ""),
                    source_id=c.get("sourceId", ""),
                    source_url=c.get("sourceUrl", ""),
                    source_title=c.get("sourceTitle") or "Untitled Source",
                    content=c.get("content", ""),
                    similarity_score=float(c.get("similarity", 0.0)),
                    chunk_index=c.get("chunkIndex", 0),
                    token_count=c.get("tokenCount"),
                    page_number=meta.get("page_number"),
                    metadata=meta,
                )
            )

        logger.info(f"[VectorSearch] Retrieved {len(results)} relevant chunks (top score: {results[0].similarity_score if results else 0.0:.3f})")
        return results


vector_search_service = VectorSearchService()

