"""ResearchForge AI Engine - Research Source & Vector Chunk Repository.

Direct async repository for ResearchSource, SourceSnapshot, ResearchRunSource,
and SourceChunk with 384-dimensional pgvector cosine similarity search.
"""

import json
import hashlib
import numpy as np
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from urllib.parse import urlparse
from psycopg.rows import dict_row

from database.connection import db
from utils.id_generator import generate_cuid
from utils.logger import logger


class SourceRepository:
    """Provides database operations for ResearchSource, SourceSnapshot, and SourceChunk."""

    @staticmethod
    def canonicalize_url(url: str) -> tuple[str, str, str]:
        """Returns (canonical_url, canonical_url_hash, domain)."""
        parsed = urlparse(url.strip())
        domain = (parsed.netloc or "").lower()
        path = parsed.path.rstrip("/")
        canonical = f"{parsed.scheme.lower()}://{domain}{path}"
        if parsed.query:
            canonical += f"?{parsed.query}"
        url_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
        return canonical, url_hash, domain

    async def get_or_create_source(
        self,
        workspace_id: str,
        url: str,
        title: Optional[str] = None,
        author: Optional[str] = None,
        source_type: str = "WEB",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Creates or gets an existing ResearchSource in the workspace."""
        canonical_url, canonical_hash, domain = self.canonicalize_url(url)
        source_id = generate_cuid("src_")
        now = datetime.now(timezone.utc)
        metadata_json = json.dumps(metadata) if metadata is not None else None

        query = """
            INSERT INTO "ResearchSource" (
                id, url, "canonicalUrl", "canonicalUrlHash", title, domain, author,
                "sourceType", status, metadata, "workspaceId", "createdAt", "updatedAt"
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s::"SourceType", 'DISCOVERED'::"SourceStatus", %s::jsonb, %s, %s, %s)
            ON CONFLICT ("workspaceId", "canonicalUrlHash") DO UPDATE
            SET title = COALESCE(EXCLUDED.title, "ResearchSource".title),
                "lastAccessedAt" = %s,
                "updatedAt" = %s
            RETURNING id, url, "canonicalUrl", "canonicalUrlHash", title, domain, author,
                      "sourceType", status, metadata, "workspaceId", "createdAt", "updatedAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (
                        source_id,
                        url,
                        canonical_url,
                        canonical_hash,
                        title,
                        domain,
                        author,
                        source_type,
                        metadata_json,
                        workspace_id,
                        now,
                        now,
                        now,
                        now,
                    ),
                )
                return await cur.fetchone()

    async def link_source_to_run(
        self,
        run_id: str,
        source_id: str,
        snapshot_id: Optional[str] = None,
        discovery_method: Optional[str] = None,
        relevance_score: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Associates a ResearchSource with a ResearchRun."""
        link_id = generate_cuid("rns_")
        now = datetime.now(timezone.utc)

        query = """
            INSERT INTO "ResearchRunSource" (
                id, "runId", "sourceId", "snapshotId", "discoveryMethod", "relevanceScore", "createdAt"
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT ("runId", "sourceId") DO UPDATE
            SET "snapshotId" = COALESCE(EXCLUDED."snapshotId", "ResearchRunSource"."snapshotId"),
                "relevanceScore" = COALESCE(EXCLUDED."relevanceScore", "ResearchRunSource"."relevanceScore")
            RETURNING id, "runId", "sourceId", "snapshotId", "discoveryMethod", "relevanceScore", "createdAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (link_id, run_id, source_id, snapshot_id, discovery_method, relevance_score, now),
                )
                return await cur.fetchone()

    async def create_snapshot(
        self,
        source_id: str,
        extracted_text: str,
        summary: Optional[str] = None,
        extraction_metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Creates a versioned text snapshot of the source."""
        snapshot_id = generate_cuid("snp_")
        now = datetime.now(timezone.utc)
        content_hash = hashlib.sha256(extracted_text.encode("utf-8")).hexdigest()
        meta_json = json.dumps(extraction_metadata) if extraction_metadata is not None else None

        query = """
            INSERT INTO "SourceSnapshot" (
                id, version, "contentHash", "extractedText", summary,
                "extractionMetadata", "fetchedAt", "createdAt", "sourceId"
            )
            VALUES (
                %s,
                COALESCE((SELECT MAX(version) FROM "SourceSnapshot" WHERE "sourceId" = %s), 0) + 1,
                %s,
                %s,
                %s,
                %s::jsonb,
                %s,
                %s,
                %s
            )
            RETURNING id, version, "contentHash", "extractedText", summary, "fetchedAt", "sourceId"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (snapshot_id, source_id, content_hash, extracted_text, summary, meta_json, now, now, source_id),
                )
                return await cur.fetchone()

    async def create_chunk(
        self,
        snapshot_id: str,
        chunk_index: int,
        content: str,
        embedding: Optional[List[float]] = None,
        token_count: Optional[int] = None,
        embedding_model: str = "BAAI/bge-small-en-v1.5",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Inserts a single chunk with its 384-dimensional pgvector embedding."""
        chunk_id = generate_cuid("chk_")
        now = datetime.now(timezone.utc)
        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
        metadata_json = json.dumps(metadata) if metadata is not None else None
        embedding_val = np.array(embedding, dtype=np.float32) if embedding is not None else None

        query = """
            INSERT INTO "SourceChunk" (
                id, "chunkIndex", content, "contentHash", "tokenCount", metadata,
                "embeddingModel", "embeddedAt", embedding, "createdAt", "snapshotId"
            )
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s)
            RETURNING id, "snapshotId", "chunkIndex", content, "tokenCount", "embeddingModel", "createdAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (
                        chunk_id,
                        chunk_index,
                        content,
                        content_hash,
                        token_count,
                        metadata_json,
                        embedding_model,
                        now if embedding is not None else None,
                        embedding_val,
                        now,
                        snapshot_id,
                    ),
                )
                return await cur.fetchone()

    async def search_similar_chunks(
        self,
        query_embedding: List[float],
        run_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
        top_k: int = 5,
        min_similarity: float = 0.2,
    ) -> List[Dict[str, Any]]:
        """Performs cosine vector similarity search against 384-dimensional SourceChunk embeddings."""
        embedding_val = np.array(query_embedding, dtype=np.float32)
        conditions = ["c.embedding IS NOT NULL"]
        params: List[Any] = [embedding_val]

        if run_id:
            conditions.append('rns."runId" = %s')
            params.append(run_id)

        if workspace_id:
            conditions.append('s."workspaceId" = %s')
            params.append(workspace_id)

        params.extend([embedding_val, min_similarity, top_k])

        query = f"""
            SELECT c.id, c."snapshotId", c."chunkIndex", c.content, c."tokenCount", c.metadata,
                   s.id AS "sourceId", s.url AS "sourceUrl", s.title AS "sourceTitle",
                   (1 - (c.embedding <=> %s)) AS similarity
            FROM "SourceChunk" c
            JOIN "SourceSnapshot" sn ON c."snapshotId" = sn.id
            JOIN "ResearchSource" s ON sn."sourceId" = s.id
            LEFT JOIN "ResearchRunSource" rns ON s.id = rns."sourceId"
            WHERE {" AND ".join(conditions)}
              AND (1 - (c.embedding <=> %s)) >= %s
            ORDER BY similarity DESC
            LIMIT %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, params)
                return await cur.fetchall()


# Global source repository instance
source_repository = SourceRepository()
