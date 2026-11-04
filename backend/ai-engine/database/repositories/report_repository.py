"""ResearchForge AI Engine - Research Report & Citation Repository.

Direct async repository for ResearchReport, ReportCitation, and ReportExport entities.
"""

import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from psycopg.rows import dict_row

from database.connection import db
from utils.id_generator import generate_cuid
from utils.logger import logger


class ReportRepository:
    """Provides database operations for ResearchReport and ReportCitation."""

    async def get_report_by_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Fetches the latest report for a research run."""
        query = """
            SELECT id, title, "executiveSummary", "contentMarkdown", status,
                   version, metadata, "runId", "createdAt", "updatedAt"
            FROM "ResearchReport"
            WHERE "runId" = %s
            ORDER BY version DESC
            LIMIT 1
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (run_id,))
                return await cur.fetchone()

    async def create_or_update_report(
        self,
        run_id: str,
        title: str,
        content_markdown: str,
        executive_summary: Optional[str] = None,
        status: str = "COMPLETED",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Creates or updates a ResearchReport for a run."""
        now = datetime.now(timezone.utc)
        metadata_json = json.dumps(metadata) if metadata is not None else None
        latest = await self.get_report_by_run(run_id)

        if latest:
            query = """
                UPDATE "ResearchReport"
                SET title = %s,
                    "contentMarkdown" = %s,
                    "executiveSummary" = COALESCE(%s, "executiveSummary"),
                    status = %s::"ReportStatus",
                    metadata = COALESCE(%s::jsonb, metadata),
                    "updatedAt" = %s
                WHERE id = %s
                RETURNING id, title, "executiveSummary", "contentMarkdown", status,
                          version, metadata, "runId", "createdAt", "updatedAt"
            """
            async with db.get_connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cur:
                    await cur.execute(
                        query,
                        (title, content_markdown, executive_summary, status, metadata_json, now, latest["id"]),
                    )
                    return await cur.fetchone()
        else:
            report_id = generate_cuid("rep_")
            query = """
                INSERT INTO "ResearchReport" (
                    id, title, "executiveSummary", "contentMarkdown", status,
                    version, metadata, "runId", "createdAt", "updatedAt"
                )
                VALUES (%s, %s, %s, %s, %s::"ReportStatus", 1, %s::jsonb, %s, %s, %s)
                RETURNING id, title, "executiveSummary", "contentMarkdown", status,
                          version, metadata, "runId", "createdAt", "updatedAt"
            """
            async with db.get_connection() as conn:
                async with conn.cursor(row_factory=dict_row) as cur:
                    await cur.execute(
                        query,
                        (report_id, title, executive_summary, content_markdown, status, metadata_json, run_id, now, now),
                    )
                    return await cur.fetchone()

    async def create_citations(
        self,
        report_id: str,
        citations: List[Dict[str, Any]],
    ) -> None:
        """Batch inserts citations for a report."""
        if not citations:
            return

        query = """
            INSERT INTO "ReportCitation" (
                id, "citationNumber", locator, anchor, "citationText",
                "claimId", "reportId", "evidenceId"
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT ("reportId", "citationNumber") DO UPDATE
            SET locator = EXCLUDED.locator,
                anchor = EXCLUDED.anchor,
                "citationText" = EXCLUDED."citationText",
                "claimId" = EXCLUDED."claimId",
                "evidenceId" = EXCLUDED."evidenceId"
        """
        async with db.get_connection() as conn:
            async with conn.cursor() as cur:
                for idx, c in enumerate(citations, 1):
                    cit_id = generate_cuid("cit_")
                    await cur.execute(
                        query,
                        (
                            cit_id,
                            c.get("citation_number", idx),
                            c.get("locator"),
                            c.get("anchor"),
                            c.get("citation_text"),
                            c.get("claim_id"),
                            report_id,
                            c.get("evidence_id"),
                        ),
                    )

    async def get_report_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        """Fetches a research report by its unique ID."""
        query = """
            SELECT id, title, "executiveSummary", "contentMarkdown", status,
                   version, metadata, "runId", "createdAt", "updatedAt"
            FROM "ResearchReport"
            WHERE id = %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (report_id,))
                return await cur.fetchone()

    async def get_citations_for_report(self, report_id: str) -> List[Dict[str, Any]]:
        """Fetches citations for a given report."""
        query = """
            SELECT c.id, c."citationNumber", c.locator, c.anchor, c."citationText",
                   c."claimId", c."reportId", c."evidenceId",
                   cl.claim as "claimText",
                   e."supportingQuote" as "evidenceQuote"
            FROM "ReportCitation" c
            LEFT JOIN "ResearchClaim" cl ON c."claimId" = cl.id
            LEFT JOIN "ResearchEvidence" e ON c."evidenceId" = e.id
            WHERE c."reportId" = %s
            ORDER BY c."citationNumber" ASC
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (report_id,))
                return await cur.fetchall()

    async def create_export(
        self,
        report_id: str,
        format_type: str,
        status: str = "COMPLETED",
        storage_key: Optional[str] = None,
        file_name: Optional[str] = None,
        file_size: Optional[int] = None,
        error_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates a ReportExport record."""
        export_id = generate_cuid("exp_")
        now = datetime.now(timezone.utc)
        completed_at = now if status == "COMPLETED" else None

        query = """
            INSERT INTO "ReportExport" (
                id, format, status, "storageKey", "fileName", "fileSize",
                "errorMessage", "createdAt", "completedAt", "reportId"
            )
            VALUES (%s, %s::"ExportFormat", %s::"ExportStatus", %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, format, status, "storageKey", "fileName", "fileSize",
                      "errorMessage", "createdAt", "completedAt", "reportId"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (
                        export_id,
                        format_type.upper(),
                        status.upper(),
                        storage_key,
                        file_name,
                        file_size,
                        error_message,
                        now,
                        completed_at,
                        report_id,
                    ),
                )
                return await cur.fetchone()

    async def get_export_by_id(self, export_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a ReportExport record by its ID."""
        query = """
            SELECT id, format, status, "storageKey", "fileName", "fileSize",
                   "errorMessage", "createdAt", "completedAt", "reportId"
            FROM "ReportExport"
            WHERE id = %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (export_id,))
                return await cur.fetchone()

    async def get_exports_for_report(self, report_id: str) -> List[Dict[str, Any]]:
        """Retrieves all exports for a report."""
        query = """
            SELECT id, format, status, "storageKey", "fileName", "fileSize",
                   "errorMessage", "createdAt", "completedAt", "reportId"
            FROM "ReportExport"
            WHERE "reportId" = %s
            ORDER BY "createdAt" DESC
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(query, (report_id,))
                return await cur.fetchall()


report_repository = ReportRepository()

