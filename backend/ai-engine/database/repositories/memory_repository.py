"""ResearchForge AI Engine - Scoped Research Memory Repository.

Direct async repository for ResearchMemory and ResearchMemorySource entities
with 384-dimensional pgvector cosine similarity search and multi-tenant isolation.
"""

import json
import numpy as np
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from psycopg.rows import dict_row

from database.connection import db
from utils.id_generator import generate_cuid
from utils.logger import logger


class MemoryRepository:
    """Provides database operations for ResearchMemory and ResearchMemorySource."""

    async def create_memory(
        self,
        scope: str,
        memory_type: str,
        content: str,
        embedding: Optional[List[float]] = None,
        workspace_id: Optional[str] = None,
        project_id: Optional[str] = None,
        user_id: Optional[str] = None,
        created_by_id: Optional[str] = None,
        source_run_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        expires_at: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Creates a new ResearchMemory with 384-dimensional pgvector embedding."""
        memory_id = generate_cuid("mem_")
        now = datetime.now(timezone.utc)
        metadata_json = json.dumps(metadata) if metadata is not None else None
        embedding_val = np.array(embedding, dtype=np.float32) if embedding is not None else None

        query = """
            INSERT INTO "ResearchMemory" (
                id, type, scope, content, metadata, embedding, "embeddingModel",
                "embeddedAt", "lastAccessedAt", "expiresAt", "workspaceId",
                "projectId", "userId", "createdById", "sourceRunId", "createdAt", "updatedAt"
            )
            VALUES (
                %s, %s::"MemoryType", %s::"MemoryScope", %s, %s::jsonb, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            RETURNING id, type, scope, content, metadata, "embeddingModel",
                      "workspaceId", "projectId", "userId", "createdAt", "updatedAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (
                        memory_id,
                        memory_type,
                        scope,
                        content,
                        metadata_json,
                        embedding_val,
                        "BAAI/bge-small-en-v1.5" if embedding is not None else None,
                        now if embedding is not None else None,
                        now,
                        expires_at,
                        workspace_id,
                        project_id,
                        user_id,
                        created_by_id,
                        source_run_id,
                        now,
                        now,
                    ),
                )
                return await cur.fetchone()

    async def get_memory(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single memory by ID and updates its lastAccessedAt timestamp."""
        now = datetime.now(timezone.utc)
        query = """
            UPDATE "ResearchMemory"
            SET "lastAccessedAt" = %s
            WHERE id = %s
            RETURNING id, type, scope, content, metadata, "embeddingModel",
                      "workspaceId", "projectId", "userId", "createdById",
                      "sourceRunId", "lastAccessedAt", "createdAt", "updatedAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (now, memory_id))
                return await cur.fetchone()

    async def update_memory(
        self,
        memory_id: str,
        content: Optional[str] = None,
        embedding: Optional[List[float]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Updates memory content, embedding, or metadata."""
        now = datetime.now(timezone.utc)
        updates = ['"updatedAt" = %s']
        params: List[Any] = [now]

        if content is not None:
            updates.append("content = %s")
            params.append(content)

        if embedding is not None:
            updates.append("embedding = %s")
            updates.append('"embeddedAt" = %s')
            params.append(np.array(embedding, dtype=np.float32))
            params.append(now)

        if metadata is not None:
            updates.append("metadata = %s::jsonb")
            params.append(json.dumps(metadata))

        params.append(memory_id)
        query = f"""
            UPDATE "ResearchMemory"
            SET {", ".join(updates)}
            WHERE id = %s
            RETURNING id, type, scope, content, metadata, "embeddingModel",
                      "workspaceId", "projectId", "userId", "updatedAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, params)
                return await cur.fetchone()

    async def delete_memory(self, memory_id: str) -> bool:
        """Deletes a memory record."""
        query = 'DELETE FROM "ResearchMemory" WHERE id = %s'
        async with db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, (memory_id,))
                return cur.rowcount > 0

    async def link_memory_source(self, memory_id: str, snapshot_id: str) -> None:
        """Links memory to supporting source snapshot."""
        id_val = generate_cuid("msc_")
        query = """
            INSERT INTO "ResearchMemorySource" (id, "memoryId", "snapshotId")
            VALUES (%s, %s, %s)
            ON CONFLICT ("memoryId", "snapshotId") DO NOTHING
        """
        async with db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, (id_val, memory_id, snapshot_id))

    async def search_memories(
        self,
        query_embedding: List[float],
        scope: Optional[str] = None,
        workspace_id: Optional[str] = None,
        project_id: Optional[str] = None,
        user_id: Optional[str] = None,
        memory_type: Optional[str] = None,
        top_k: int = 5,
        min_similarity: float = 0.25,
    ) -> List[Dict[str, Any]]:
        """Performs vector similarity search across memories respecting strict scope isolation."""
        embedding_val = np.array(query_embedding, dtype=np.float32)
        conditions = [
            "m.embedding IS NOT NULL",
            '(m."expiresAt" IS NULL OR m."expiresAt" > NOW())',
        ]
        params: List[Any] = [embedding_val]

        if scope:
            conditions.append('m.scope = %s::"MemoryScope"')
            params.append(scope)

        if workspace_id:
            conditions.append('m."workspaceId" = %s')
            params.append(workspace_id)

        if project_id:
            conditions.append('m."projectId" = %s')
            params.append(project_id)

        if user_id:
            conditions.append('m."userId" = %s')
            params.append(user_id)

        if memory_type:
            conditions.append('m.type = %s::"MemoryType"')
            params.append(memory_type)

        params.extend([embedding_val, min_similarity, top_k])

        query = f"""
            SELECT m.id, m.type, m.scope, m.content, m.metadata, m."workspaceId",
                   m."projectId", m."userId", m."createdAt", m."lastAccessedAt",
                   (1 - (m.embedding <=> %s)) AS similarity
            FROM "ResearchMemory" m
            WHERE {" AND ".join(conditions)}
              AND (1 - (m.embedding <=> %s)) >= %s
            ORDER BY similarity DESC
            LIMIT %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, params)
                return await cur.fetchall()

    async def list_memories(
        self,
        scope: Optional[str] = None,
        workspace_id: Optional[str] = None,
        project_id: Optional[str] = None,
        user_id: Optional[str] = None,
        memory_type: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Lists memories matching filter criteria."""
        conditions = ['(m."expiresAt" IS NULL OR m."expiresAt" > NOW())']
        params: List[Any] = []

        if scope:
            conditions.append('m.scope = %s::"MemoryScope"')
            params.append(scope)

        if workspace_id:
            conditions.append('m."workspaceId" = %s')
            params.append(workspace_id)

        if project_id:
            conditions.append('m."projectId" = %s')
            params.append(project_id)

        if user_id:
            conditions.append('m."userId" = %s')
            params.append(user_id)

        if memory_type:
            conditions.append('m.type = %s::"MemoryType"')
            params.append(memory_type)

        params.append(limit)

        query = f"""
            SELECT m.id, m.type, m.scope, m.content, m.metadata, m."workspaceId",
                   m."projectId", m."userId", m."createdAt", m."lastAccessedAt"
            FROM "ResearchMemory" m
            WHERE {" AND ".join(conditions)}
            ORDER BY m."createdAt" DESC
            LIMIT %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, params)
                return await cur.fetchall()


memory_repository = MemoryRepository()

