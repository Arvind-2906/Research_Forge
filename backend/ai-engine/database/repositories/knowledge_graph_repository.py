"""ResearchForge AI Engine - Knowledge Graph Repository.

Handles direct PostgreSQL operations for KnowledgeNode and KnowledgeEdge entities,
including vector cosine similarity search, neighborhood traversal, and edge management.
"""

import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from psycopg.rows import dict_row

from database.connection import db
from utils.id_generator import generate_cuid
from utils.logger import logger


class KnowledgeGraphRepository:
    """Async repository for KnowledgeNode and KnowledgeEdge persistence."""

    async def create_node(
        self,
        workspace_id: str,
        name: str,
        node_type: str = "CONCEPT",
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        embedding: Optional[List[float]] = None,
        embedding_model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates a knowledge node with optional vector embedding."""
        node_id = generate_cuid("kn_")
        now = datetime.now(timezone.utc)
        meta_json = json.dumps(metadata) if metadata is not None else None
        embedding_str = f"[{','.join(str(x) for x in embedding)}]" if embedding else None

        query = """
            INSERT INTO "KnowledgeNode" (
                id, name, description, type, metadata,
                embedding, "embeddingModel", "workspaceId", "createdAt", "updatedAt"
            )
            VALUES (
                %s, %s, %s, %s::"KnowledgeNodeType", %s::jsonb,
                %s::vector, %s, %s, %s, %s
            )
            RETURNING id, name, description, type, metadata, "embeddingModel",
                      "workspaceId", "createdAt", "updatedAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (
                        node_id,
                        name,
                        description,
                        node_type.upper(),
                        meta_json,
                        embedding_str,
                        embedding_model,
                        workspace_id,
                        now,
                        now,
                    ),
                )
                return await cur.fetchone()

    async def get_node_by_id(self, node_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single knowledge node by its ID."""
        query = """
            SELECT id, name, description, type, metadata, "embeddingModel",
                   "workspaceId", "createdAt", "updatedAt"
            FROM "KnowledgeNode"
            WHERE id = %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (node_id,))
                return await cur.fetchone()

    async def update_node(
        self,
        node_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        node_type: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        embedding: Optional[List[float]] = None,
    ) -> Optional[Dict[str, Any]]:
        """Updates an existing knowledge node."""
        now = datetime.now(timezone.utc)
        meta_json = json.dumps(metadata) if metadata is not None else None
        embedding_str = f"[{','.join(str(x) for x in embedding)}]" if embedding else None

        query = """
            UPDATE "KnowledgeNode"
            SET name = COALESCE(%s, name),
                description = COALESCE(%s, description),
                type = COALESCE(%s::"KnowledgeNodeType", type),
                metadata = COALESCE(%s::jsonb, metadata),
                embedding = COALESCE(%s::vector, embedding),
                "updatedAt" = %s
            WHERE id = %s
            RETURNING id, name, description, type, metadata, "embeddingModel",
                      "workspaceId", "createdAt", "updatedAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (name, description, node_type.upper() if node_type else None, meta_json, embedding_str, now, node_id),
                )
                return await cur.fetchone()

    async def delete_node(self, node_id: str) -> bool:
        """Deletes a node and associated edges."""
        query = 'DELETE FROM "KnowledgeNode" WHERE id = %s'
        async with db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, (node_id,))
                return cur.rowcount > 0

    async def list_nodes(
        self,
        workspace_id: str,
        node_type: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Lists nodes for a workspace with optional type filtering and search."""
        clauses = ['"workspaceId" = %s']
        params: List[Any] = [workspace_id]

        if node_type:
            clauses.append('type = %s::"KnowledgeNodeType"')
            params.append(node_type.upper())

        if search:
            clauses.append('(name ILIKE %s OR description ILIKE %s)')
            params.extend([f"%{search}%", f"%{search}%"])

        params.extend([limit, offset])
        where_sql = " AND ".join(clauses)

        query = f"""
            SELECT id, name, description, type, metadata, "embeddingModel",
                   "workspaceId", "createdAt", "updatedAt"
            FROM "KnowledgeNode"
            WHERE {where_sql}
            ORDER BY "createdAt" DESC
            LIMIT %s OFFSET %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, tuple(params))
                return await cur.fetchall()

    async def create_edge(
        self,
        source_node_id: str,
        target_node_id: str,
        relationship: str = "RELATED_TO",
        description: Optional[str] = None,
        weight: float = 1.0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Creates or updates a typed edge between two knowledge nodes."""
        edge_id = generate_cuid("ke_")
        now = datetime.now(timezone.utc)
        meta_json = json.dumps(metadata) if metadata is not None else None

        query = """
            INSERT INTO "KnowledgeEdge" (
                id, relationship, description, weight, metadata,
                "sourceNodeId", "targetNodeId", "createdAt"
            )
            VALUES (%s, %s::"KnowledgeRelationType", %s, %s, %s::jsonb, %s, %s, %s)
            ON CONFLICT ("sourceNodeId", "targetNodeId", relationship) DO UPDATE
            SET description = COALESCE(EXCLUDED.description, "KnowledgeEdge".description),
                weight = EXCLUDED.weight,
                metadata = COALESCE(EXCLUDED.metadata, "KnowledgeEdge".metadata)
            RETURNING id, relationship, description, weight, metadata,
                      "sourceNodeId", "targetNodeId", "createdAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (
                        edge_id,
                        relationship.upper(),
                        description,
                        weight,
                        meta_json,
                        source_node_id,
                        target_node_id,
                        now,
                    ),
                )
                return await cur.fetchone()

    async def delete_edge(self, edge_id: str) -> bool:
        """Deletes a knowledge edge."""
        query = 'DELETE FROM "KnowledgeEdge" WHERE id = %s'
        async with db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, (edge_id,))
                return cur.rowcount > 0

    async def get_edges_for_node(self, node_id: str) -> List[Dict[str, Any]]:
        """Retrieves all connected edges for a given node."""
        query = """
            SELECT e.id, e.relationship, e.description, e.weight, e.metadata,
                   e."sourceNodeId", e."targetNodeId", e."createdAt",
                   sn.name as "sourceName", sn.type as "sourceType",
                   tn.name as "targetName", tn.type as "targetType"
            FROM "KnowledgeEdge" e
            JOIN "KnowledgeNode" sn ON e."sourceNodeId" = sn.id
            JOIN "KnowledgeNode" tn ON e."targetNodeId" = tn.id
            WHERE e."sourceNodeId" = %s OR e."targetNodeId" = %s
            ORDER BY e."createdAt" DESC
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (node_id, node_id))
                return await cur.fetchall()

    async def get_neighborhood(self, node_id: str, depth: int = 1, limit: int = 50) -> Dict[str, Any]:
        """Retrieves the subgraph surrounding a central node up to depth (1 or 2)."""
        center_node = await self.get_node_by_id(node_id)
        if not center_node:
            return {"center": None, "nodes": [], "edges": []}

        # Retrieve direct edges
        edges = await self.get_edges_for_node(node_id)
        connected_node_ids = set()
        for e in edges:
            connected_node_ids.add(e["sourceNodeId"])
            connected_node_ids.add(e["targetNodeId"])

        connected_node_ids.discard(node_id)

        all_nodes = [center_node]
        if connected_node_ids:
            query = """
                SELECT id, name, description, type, metadata, "embeddingModel",
                       "workspaceId", "createdAt", "updatedAt"
                FROM "KnowledgeNode"
                WHERE id = ANY(%s)
                LIMIT %s
            """
            async with db.get_connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cur:
                    await cur.execute(query, (list(connected_node_ids), limit))
                    neighbors = await cur.fetchall()
                    all_nodes.extend(neighbors)

        return {
            "center": center_node,
            "nodes": all_nodes,
            "edges": edges[:limit],
        }

    async def search_nodes_semantic(
        self,
        workspace_id: str,
        query_embedding: List[float],
        limit: int = 20,
        min_similarity: float = 0.35,
        node_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Performs pgvector cosine similarity search over knowledge nodes."""
        embedding_str = f"[{','.join(str(x) for x in query_embedding)}]"
        clauses = [
            '"workspaceId" = %s',
            'embedding IS NOT NULL',
            '(1 - (embedding <=> %s::vector)) >= %s',
        ]
        query_params: List[Any] = [embedding_str, workspace_id, embedding_str, min_similarity]

        if node_type:
            clauses.append('type = %s::"KnowledgeNodeType"')
            query_params.append(node_type.upper())

        where_sql = " AND ".join(clauses)
        query_params.append(limit)

        full_query = f"""
            SELECT id, name, description, type, metadata, "embeddingModel",
                   "workspaceId", "createdAt", "updatedAt",
                   (1 - (embedding <=> %s::vector)) as similarity
            FROM "KnowledgeNode"
            WHERE {where_sql}
            ORDER BY similarity DESC
            LIMIT %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(full_query, tuple(query_params))
                return await cur.fetchall()

    async def find_duplicate_node(
        self,
        workspace_id: str,
        name: str,
        node_type: str,
        query_embedding: Optional[List[float]] = None,
        similarity_threshold: float = 0.90,
    ) -> Optional[Dict[str, Any]]:
        """Finds if a node with matching name or high semantic similarity already exists."""
        # 1. Exact or case-insensitive name match
        query = """
            SELECT id, name, description, type, metadata, "embeddingModel",
                   "workspaceId", "createdAt", "updatedAt"
            FROM "KnowledgeNode"
            WHERE "workspaceId" = %s
              AND LOWER(name) = LOWER(%s)
              AND type = %s::"KnowledgeNodeType"
            LIMIT 1
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (workspace_id, name.strip(), node_type.upper()))
                match = await cur.fetchone()
                if match:
                    return match

        # 2. High cosine similarity if embedding provided
        if query_embedding:
            embedding_str = f"[{','.join(str(x) for x in query_embedding)}]"
            sim_query = """
                SELECT id, name, description, type, metadata, "embeddingModel",
                       "workspaceId", "createdAt", "updatedAt",
                       (1 - (embedding <=> %s::vector)) as similarity
                FROM "KnowledgeNode"
                WHERE "workspaceId" = %s
                  AND type = %s::"KnowledgeNodeType"
                  AND embedding IS NOT NULL
                  AND (1 - (embedding <=> %s::vector)) >= %s
                ORDER BY similarity DESC
                LIMIT 1
            """
            async with db.get_connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cur:
                    await cur.execute(
                        sim_query,
                        (embedding_str, workspace_id, node_type.upper(), embedding_str, similarity_threshold),
                    )
                    return await cur.fetchone()

        return None


knowledge_graph_repository = KnowledgeGraphRepository()
