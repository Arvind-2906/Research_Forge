"""ResearchForge AI Engine - Scoped Memory API Routes.
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field

from api.dependencies.auth import verify_internal_service_key
from services.memory_service import memory_service, MemoryCreateRequest, MemorySearchRequest
from utils.logger import logger

router = APIRouter(prefix="/api/v1/memory", tags=["Scoped Research Memory"])


class MemoryUpdateRequest(BaseModel):
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_memory_endpoint(
    req: MemoryCreateRequest,
    consolidate: bool = Query(True, description="Whether to consolidate with highly similar existing memories"),
    _auth: None = Depends(verify_internal_service_key),
):
    """Creates a new memory or consolidates with an existing matching memory."""
    try:
        return await memory_service.add_memory(req, consolidate=consolidate)
    except Exception as e:
        logger.error(f"[Memory API] Failed to add memory: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create memory: {str(e)}",
        )


@router.post("/search")
async def search_memories_endpoint(
    req: MemorySearchRequest,
    _auth: None = Depends(verify_internal_service_key),
):
    """Executes pgvector similarity search across memories respecting scope boundaries."""
    try:
        return await memory_service.search_memories(req)
    except Exception as e:
        logger.error(f"[Memory API] Memory search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Memory search failed: {str(e)}",
        )


@router.get("")
async def list_memories_endpoint(
    scope: Optional[str] = Query(None),
    workspace_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    memory_type: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    _auth: None = Depends(verify_internal_service_key),
):
    """Lists memories matching filter criteria."""
    try:
        return await memory_service.list_memories(
            scope=scope,
            workspace_id=workspace_id,
            project_id=project_id,
            user_id=user_id,
            memory_type=memory_type,
            limit=limit,
        )
    except Exception as e:
        logger.error(f"[Memory API] Failed to list memories: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list memories: {str(e)}",
        )


@router.get("/{memory_id}")
async def get_memory_endpoint(
    memory_id: str,
    _auth: None = Depends(verify_internal_service_key),
):
    """Retrieves a single memory by ID."""
    memory = await memory_service.get_memory(memory_id)
    if not memory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Memory '{memory_id}' not found")
    return memory


@router.patch("/{memory_id}")
async def update_memory_endpoint(
    memory_id: str,
    req: MemoryUpdateRequest,
    _auth: None = Depends(verify_internal_service_key),
):
    """Updates memory content or metadata, re-embedding if content changes."""
    updated = await memory_service.update_memory(
        memory_id=memory_id,
        content=req.content,
        metadata=req.metadata,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Memory '{memory_id}' not found")
    return updated


@router.delete("/{memory_id}")
async def delete_memory_endpoint(
    memory_id: str,
    _auth: None = Depends(verify_internal_service_key),
):
    """Deletes a memory record."""
    deleted = await memory_service.delete_memory(memory_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Memory '{memory_id}' not found")
    return {"success": True, "message": f"Memory '{memory_id}' deleted successfully"}

