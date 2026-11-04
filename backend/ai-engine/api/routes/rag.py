"""ResearchForge AI Engine - RAG & Retrieval API Routes.
"""

import base64
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from api.dependencies.auth import verify_internal_service_key
from rag.pipelines.rag_pipeline import rag_pipeline, IngestionResult, AssembledContext
from rag.retrieval.vector_search import vector_search_service, SearchRequest, RetrievalResult
from utils.logger import logger

router = APIRouter(prefix="/api/v1/rag", tags=["RAG & Document Intelligence"])


class IngestDocumentRequest(BaseModel):
    filename: str
    content_base64: Optional[str] = None
    content_text: Optional[str] = None
    workspace_id: str
    project_id: Optional[str] = None
    run_id: Optional[str] = None
    mime_type: Optional[str] = None


class ContextQueryRequest(BaseModel):
    query: str
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None
    run_id: Optional[str] = None
    top_k: int = 5


@router.post("/ingest", response_model=IngestionResult)
async def ingest_document_endpoint(
    req: IngestDocumentRequest,
    _auth: None = Depends(verify_internal_service_key),
):
    """Parses, chunks, embeds, and stores a document in the vector knowledge base."""
    if not req.content_base64 and not req.content_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'content_base64' or 'content_text' must be provided",
        )

    try:
        if req.content_base64:
            raw_bytes = base64.b64decode(req.content_base64)
        else:
            raw_bytes = req.content_text.encode("utf-8")

        result = await rag_pipeline.ingest_document(
            content=raw_bytes,
            filename=req.filename,
            workspace_id=req.workspace_id,
            project_id=req.project_id,
            run_id=req.run_id,
            mime_type=req.mime_type,
        )
        return result
    except Exception as e:
        logger.error(f"[RAG API] Ingestion failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document ingestion failed: {str(e)}",
        )


@router.post("/search", response_model=List[RetrievalResult])
async def search_rag_chunks_endpoint(
    req: SearchRequest,
    _auth: None = Depends(verify_internal_service_key),
):
    """Executes pgvector cosine similarity search across knowledge chunks."""
    try:
        return await vector_search_service.search(req)
    except Exception as e:
        logger.error(f"[RAG API] Vector search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector search failed: {str(e)}",
        )


@router.post("/context", response_model=AssembledContext)
async def retrieve_context_endpoint(
    req: ContextQueryRequest,
    _auth: None = Depends(verify_internal_service_key),
):
    """Retrieves relevant passages and compiles formatted context with source attribution."""
    try:
        return await rag_pipeline.retrieve_context(
            query=req.query,
            workspace_id=req.workspace_id,
            project_id=req.project_id,
            run_id=req.run_id,
            top_k=req.top_k,
        )
    except Exception as e:
        logger.error(f"[RAG API] Context assembly failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Context retrieval failed: {str(e)}",
        )

