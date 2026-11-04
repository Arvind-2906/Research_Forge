"""ResearchForge AI Engine - Knowledge Graph API Routes.

Exposes REST endpoints for knowledge nodes, typed edges, semantic search,
local neighborhood expansion, and automatic graph population from research runs.
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

from utils.logger import logger
from database.repositories.knowledge_graph_repository import knowledge_graph_repository
from services.knowledge_graph_service import knowledge_graph_service

router = APIRouter(prefix="/api/v1/kg", tags=["Knowledge Graph"])


class NodeCreateRequest(BaseModel):
    workspace_id: str
    name: str
    type: str = Field(default="CONCEPT", description="TOPIC, CONCEPT, CLAIM, ENTITY, SOURCE, etc.")
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    deduplicate: bool = True


class NodeUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class EdgeCreateRequest(BaseModel):
    source_node_id: str
    target_node_id: str
    relationship: str = Field(
        default="RELATED_TO",
        description="RELATED_TO, SUPPORTS, CONTRADICTS, DEPENDS_ON, PART_OF, REFERENCES, etc.",
    )
    description: Optional[str] = None
    weight: float = 1.0
    metadata: Optional[Dict[str, Any]] = None


class GraphSearchRequest(BaseModel):
    workspace_id: str
    query: str
    node_type: Optional[str] = None
    limit: int = Field(default=20, ge=1, le=100)
    min_similarity: float = Field(default=0.30, ge=0.0, le=1.0)


class PopulateRunRequest(BaseModel):
    workspace_id: str


@router.post("/nodes")
async def create_node(req: NodeCreateRequest):
    """Creates a new knowledge node with automatic 384-d semantic embedding and deduplication."""
    try:
        node = await knowledge_graph_service.add_or_merge_node(
            workspace_id=req.workspace_id,
            name=req.name,
            node_type=req.type,
            description=req.description,
            metadata=req.metadata,
            deduplicate=req.deduplicate,
        )
        return {"success": True, "data": node}
    except Exception as e:
        logger.error(f"[KG] Node creation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create knowledge node: {e}",
        )


@router.get("/nodes")
async def list_nodes(
    workspace_id: str = Query(..., description="Workspace ID"),
    node_type: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Lists knowledge nodes in a workspace."""
    nodes = await knowledge_graph_repository.list_nodes(
        workspace_id=workspace_id,
        node_type=node_type,
        search=search,
        limit=limit,
        offset=offset,
    )
    return {"success": True, "data": nodes}


@router.get("/nodes/{node_id}")
async def get_node(node_id: str):
    """Retrieves a single knowledge node by ID."""
    node = await knowledge_graph_repository.get_node_by_id(node_id)
    if not node:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Node '{node_id}' not found.")
    return {"success": True, "data": node}


@router.patch("/nodes/{node_id}")
async def update_node(node_id: str, req: NodeUpdateRequest):
    """Updates node properties."""
    updated = await knowledge_graph_repository.update_node(
        node_id=node_id,
        name=req.name,
        description=req.description,
        node_type=req.type,
        metadata=req.metadata,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Node '{node_id}' not found.")
    return {"success": True, "data": updated}


@router.delete("/nodes/{node_id}")
async def delete_node(node_id: str):
    """Deletes a node and associated edges."""
    deleted = await knowledge_graph_repository.delete_node(node_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Node '{node_id}' not found.")
    return {"success": True, "message": "Node deleted successfully"}


@router.post("/edges")
async def create_edge(req: EdgeCreateRequest):
    """Creates or updates a typed edge between two knowledge nodes."""
    try:
        edge = await knowledge_graph_repository.create_edge(
            source_node_id=req.source_node_id,
            target_node_id=req.target_node_id,
            relationship=req.relationship,
            description=req.description,
            weight=req.weight,
            metadata=req.metadata,
        )
        return {"success": True, "data": edge}
    except Exception as e:
        logger.error(f"[KG] Edge creation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create edge: {e}",
        )


@router.delete("/edges/{edge_id}")
async def delete_edge(edge_id: str):
    """Deletes an edge."""
    deleted = await knowledge_graph_repository.delete_edge(edge_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Edge '{edge_id}' not found.")
    return {"success": True, "message": "Edge deleted successfully"}


@router.get("/neighborhood/{node_id}")
async def get_neighborhood(
    node_id: str,
    depth: int = Query(1, ge=1, le=2),
    limit: int = Query(50, ge=1, le=200),
):
    """Retrieves subgraph neighborhood (center node, neighbors, and connecting edges)."""
    graph = await knowledge_graph_repository.get_neighborhood(node_id=node_id, depth=depth, limit=limit)
    if not graph.get("center"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Node '{node_id}' not found.")
    return {"success": True, "data": graph}


@router.post("/search")
async def search_graph(req: GraphSearchRequest):
    """Executes hybrid vector cosine and keyword search over knowledge nodes."""
    results = await knowledge_graph_service.search_graph(
        workspace_id=req.workspace_id,
        query=req.query,
        node_type=req.node_type,
        limit=req.limit,
        min_similarity=req.min_similarity,
    )
    return {"success": True, "data": results}


@router.post("/populate-from-run/{run_id}")
async def populate_from_run(run_id: str, req: PopulateRunRequest):
    """Extracts claims, sources, and topic from a completed run into the knowledge graph."""
    try:
        summary = await knowledge_graph_service.populate_from_run(run_id=run_id, workspace_id=req.workspace_id)
        return {"success": True, "data": summary}
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"[KG] Population from run failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to populate knowledge graph from run: {e}",
        )

