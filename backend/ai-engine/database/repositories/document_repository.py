"""ResearchForge AI Engine - Document Asset Repository.

Direct async repository for DocumentAsset entity.
"""

import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from psycopg.rows import dict_row

from database.connection import db
from utils.id_generator import generate_cuid
from utils.logger import logger


class DocumentRepository:
    """Provides database operations for DocumentAsset."""

    async def create_document(
        self,
        workspace_id: str,
        file_name: str,
        original_name: str,
        mime_type: str,
        file_size: int,
        storage_key: str,
        uploaded_by_id: str,
        project_id: Optional[str] = None,
        run_id: Optional[str] = None,
        content_hash: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Creates a new DocumentAsset record."""
        doc_id = generate_cuid("doc_")
        now = datetime.now(timezone.utc)
        metadata_json = json.dumps(metadata) if metadata is not None else None

        query = """
            INSERT INTO "DocumentAsset" (
                id, "fileName", "originalName", "mimeType", "fileSize",
                "storageKey", status, "contentHash", metadata, "workspaceId",
                "projectId", "runId", "uploadedById", "createdAt"
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, 'UPLOADED'::"DocumentStatus",
                %s, %s::jsonb, %s, %s, %s, %s, %s
            )
            RETURNING id, "fileName", "originalName", "mimeType", "fileSize",
                      "storageKey", status, "contentHash", metadata, "workspaceId",
                      "projectId", "runId", "uploadedById", "createdAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (
                        doc_id,
                        file_name,
                        original_name,
                        mime_type,
                        file_size,
                        storage_key,
                        content_hash,
                        metadata_json,
                        workspace_id,
                        project_id,
                        run_id,
                        uploaded_by_id,
                        now,
                    ),
                )
                return await cur.fetchone()

    async def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a document asset by ID."""
        query = """
            SELECT id, "fileName", "originalName", "mimeType", "fileSize",
                   "storageKey", status, "contentHash", metadata, "errorMessage",
                   "workspaceId", "projectId", "runId", "uploadedById",
                   "createdAt", "processedAt"
            FROM "DocumentAsset"
            WHERE id = %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (doc_id,))
                return await cur.fetchone()

    async def update_status(
        self,
        doc_id: str,
        status: str,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Updates document processing status."""
        now = datetime.now(timezone.utc)
        updates = ['status = %s::"DocumentStatus"']
        params: List[Any] = [status]

        if status == "PROCESSED":
            updates.append('"processedAt" = %s')
            params.append(now)

        if error_message is not None:
            updates.append('"errorMessage" = %s')
            params.append(error_message)

        if metadata is not None:
            updates.append("metadata = %s::jsonb")
            params.append(json.dumps(metadata))

        params.append(doc_id)
        query = f'UPDATE "DocumentAsset" SET {", ".join(updates)} WHERE id = %s'

        async with db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, params)
                return cur.rowcount > 0

    async def list_documents(
        self,
        workspace_id: str,
        project_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Lists documents for a workspace/project."""
        conditions = ['"workspaceId" = %s']
        params: List[Any] = [workspace_id]

        if project_id:
            conditions.append('"projectId" = %s')
            params.append(project_id)

        params.append(limit)
        query = f"""
            SELECT id, "fileName", "originalName", "mimeType", "fileSize",
                   "storageKey", status, "contentHash", metadata, "errorMessage",
                   "workspaceId", "projectId", "createdAt", "processedAt"
            FROM "DocumentAsset"
            WHERE {" AND ".join(conditions)}
            ORDER BY "createdAt" DESC
            LIMIT %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, params)
                return await cur.fetchall()

    async def delete_document(self, doc_id: str) -> bool:
        """Deletes a document asset."""
        query = 'DELETE FROM "DocumentAsset" WHERE id = %s'
        async with db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, (doc_id,))
                return cur.rowcount > 0


document_repository = DocumentRepository()

