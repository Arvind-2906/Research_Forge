"""ResearchForge AI Engine - Report and Citation Endpoints.

Provides report export generation (Markdown, PDF, DOCX, HTML), file downloads,
and citation integrity validation against sources and claims.
"""

import os
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from utils.logger import logger
from database.repositories.report_repository import report_repository
from database.repositories.claim_repository import claim_repository
from database.repositories.source_repository import source_repository
from services.report_export_service import report_export_service

router = APIRouter(prefix="/api/v1/reports", tags=["Reports & Exports"])


class ExportRequest(BaseModel):
    report_id: str
    format: str = Field(default="MARKDOWN", description="MARKDOWN, PDF, DOCX, or HTML")


class ValidateCitationRequest(BaseModel):
    report_id: Optional[str] = None
    content_markdown: Optional[str] = None
    citations: Optional[List[Dict[str, Any]]] = None


@router.post("/export")
async def export_report(req: ExportRequest):
    """Generates an export of the research report in the requested format."""
    fmt = req.format.upper()
    if fmt not in ["PDF", "DOCX", "MARKDOWN", "HTML"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported export format '{req.format}'. Must be one of PDF, DOCX, MARKDOWN, HTML.",
        )

    report = await report_repository.get_report_by_id(req.report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research report '{req.report_id}' not found.",
        )

    citations = await report_repository.get_citations_for_report(req.report_id)

    file_path = None
    file_size = 0
    file_name = None

    try:
        if fmt == "MARKDOWN":
            md_content = report_export_service.export_markdown(report, citations)
            file_name = f"{req.report_id}.md"
            out_file = report_export_service.export_dir / file_name
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(md_content)
            file_path = str(out_file)
            file_size = os.path.getsize(file_path)

        elif fmt == "DOCX":
            file_name = f"{req.report_id}.docx"
            file_path, file_size = report_export_service.export_docx(report, citations, filename=file_name)

        elif fmt == "PDF":
            file_name = f"{req.report_id}.pdf"
            file_path, file_size = report_export_service.export_pdf(report, citations, filename=file_name)

        elif fmt == "HTML":
            file_name = f"{req.report_id}.html"
            file_path, file_size = report_export_service.export_html(report, citations, filename=file_name)

        export_record = await report_repository.create_export(
            report_id=req.report_id,
            format_type=fmt,
            status="COMPLETED",
            storage_key=file_path,
            file_name=file_name,
            file_size=file_size,
        )

        return {"success": True, "data": export_record}

    except Exception as e:
        logger.error(f"[ReportExport] Export generation failed: {e}", exc_info=True)
        # Attempt to save failed record
        await report_repository.create_export(
            report_id=req.report_id,
            format_type=fmt,
            status="FAILED",
            error_message=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export generation failed: {e}",
        )


@router.get("/export/{export_id}/download")
async def download_export(export_id: str):
    """Streams the generated export file for download."""
    export_rec = await report_repository.get_export_by_id(export_id)
    if not export_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Export record '{export_id}' not found.",
        )

    file_path = export_rec.get("storageKey")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export file not found on disk.",
        )

    fmt = export_rec.get("format", "MARKDOWN")
    media_types = {
        "PDF": "application/pdf",
        "DOCX": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "MARKDOWN": "text/markdown",
        "HTML": "text/html",
    }
    media_type = media_types.get(fmt, "application/octet-stream")
    file_name = export_rec.get("fileName") or f"report_export.{fmt.lower()}"

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=file_name,
    )


@router.post("/validate-citations")
async def validate_citations(req: ValidateCitationRequest):
    """Audits report citations, detecting orphaned tags, dangling references, and broken claim links."""
    content_markdown = req.content_markdown
    citations = req.citations or []
    registered_claims = []
    registered_sources = []

    if req.report_id:
        report = await report_repository.get_report_by_id(req.report_id)
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Report '{req.report_id}' not found.",
            )
        content_markdown = content_markdown or report.get("contentMarkdown", "")
        if not citations:
            citations = await report_repository.get_citations_for_report(req.report_id)

        run_id = report.get("runId")
        if run_id:
            registered_claims = await claim_repository.get_claims_by_run(run_id)
            registered_sources = await source_repository.get_sources_by_run(run_id)

    if not content_markdown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="content_markdown or valid report_id is required for citation validation.",
        )

    audit = report_export_service.validate_citations(
        content_markdown=content_markdown,
        citations=citations,
        registered_claims=registered_claims,
        registered_sources=registered_sources,
    )

    return {"success": True, "data": audit}


@router.get("/{report_id}")
async def get_report_details(report_id: str):
    """Retrieves full report details along with citations and export history."""
    report = await report_repository.get_report_by_id(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found.",
        )

    citations = await report_repository.get_citations_for_report(report_id)
    exports = await report_repository.get_exports_for_report(report_id)

    return {
        "success": True,
        "data": {
            **report,
            "citations": citations,
            "exports": exports,
        },
    }

