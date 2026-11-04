"""ResearchForge AI Engine - Scoped Memory Service.

Orchestrates semantic memory creation, 384-dimensional vector embedding,
consolidation of duplicate memories, and strict multi-tenant scope isolation.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from embeddings.embedding_service import embedding_service
from database.repositories import memory_repository
from utils.logger import logger


class MemoryCreateRequest(BaseModel):
    content: str
    scope: str = Field(description="USER, WORKSPACE, or PROJECT")
    memory_type: str = Field(description="RESEARCH_FINDING, USER_PREFERENCE, PROJECT_CONTEXT, IMPORTANT_FACT, RESEARCH_SUMMARY")
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None
    user_id: Optional[str] = None
    created_by_id: Optional[str] = None
    source_run_id: Optional[str] = None
    snapshot_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MemorySearchRequest(BaseModel):
    query: str
    scope: Optional[str] = None
    workspace_id: Optional[str] = None
    project_id: Optional[str] = None
    user_id: Optional[str] = None
    memory_type: Optional[str] = None
    top_k: int = 5
    min_similarity: float = 0.25


class ScopedMemoryService:
    """Manages persistent research memories across USER, WORKSPACE, and PROJECT scopes."""

    async def add_memory(self, req: MemoryCreateRequest, consolidate: bool = True) -> Dict[str, Any]:
        """Creates a memory or consolidates with an existing highly-similar memory."""
        logger.info(f"[MemoryService] Storing memory (scope: {req.scope}, type: {req.memory_type})")

        # 1. Generate 384-dimensional embedding
        embedding = await embedding_service.embed_query(req.content)

        # 2. Consolidation check (detect if similar memory exists in same scope)
        if consolidate:
            similar = await memory_repository.search_memories(
                query_embedding=embedding,
                scope=req.scope,
                workspace_id=req.workspace_id,
                project_id=req.project_id,
                user_id=req.user_id,
                memory_type=req.memory_type,
                top_k=1,
                min_similarity=0.88,  # High similarity threshold for consolidation
            )
            if similar:
                existing = similar[0]
                logger.info(f"[MemoryService] Consolidating memory into existing record {existing['id']} (sim: {existing.get('similarity', 0):.3f})")
                updated_meta = existing.get("metadata") or {}
                updated_meta.update(req.metadata)
                updated_meta["consolidation_count"] = updated_meta.get("consolidation_count", 1) + 1

                consolidated = await memory_repository.update_memory(
                    memory_id=existing["id"],
                    content=req.content,
                    embedding=embedding,
                    metadata=updated_meta,
                )
                if req.snapshot_id and consolidated:
                    await memory_repository.link_memory_source(consolidated["id"], req.snapshot_id)
                return consolidated or existing

        # 3. Create fresh memory record
        created = await memory_repository.create_memory(
            scope=req.scope,
            memory_type=req.memory_type,
            content=req.content,
            embedding=embedding,
            workspace_id=req.workspace_id,
            project_id=req.project_id,
            user_id=req.user_id,
            created_by_id=req.created_by_id,
            source_run_id=req.source_run_id,
            metadata=req.metadata,
        )

        # 4. Link source snapshot if provided
        if req.snapshot_id and created:
            await memory_repository.link_memory_source(created["id"], req.snapshot_id)

        return created

    async def search_memories(self, req: MemorySearchRequest) -> List[Dict[str, Any]]:
        """Performs vector similarity search across memories respecting scope boundaries."""
        query_vector = await embedding_service.embed_query(req.query)

        results = await memory_repository.search_memories(
            query_embedding=query_vector,
            scope=req.scope,
            workspace_id=req.workspace_id,
            project_id=req.project_id,
            user_id=req.user_id,
            memory_type=req.memory_type,
            top_k=req.top_k,
            min_similarity=req.min_similarity,
        )

        return results

    async def get_memory(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a memory record."""
        return await memory_repository.get_memory(memory_id)

    async def update_memory(
        self,
        memory_id: str,
        content: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Updates a memory record and re-embeds content if changed."""
        embedding = None
        if content is not None:
            embedding = await embedding_service.embed_query(content)

        return await memory_repository.update_memory(
            memory_id=memory_id,
            content=content,
            embedding=embedding,
            metadata=metadata,
        )

    async def delete_memory(self, memory_id: str) -> bool:
        """Deletes a memory record."""
        return await memory_repository.delete_memory(memory_id)

    async def list_memories(
        self,
        scope: Optional[str] = None,
        workspace_id: Optional[str] = None,
        project_id: Optional[str] = None,
        user_id: Optional[str] = None,
        memory_type: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Lists memories by scope or filters."""
        return await memory_repository.list_memories(
            scope=scope,
            workspace_id=workspace_id,
            project_id=project_id,
            user_id=user_id,
            memory_type=memory_type,
            limit=limit,
        )


memory_service = ScopedMemoryService()

