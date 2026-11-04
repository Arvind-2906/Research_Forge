"""ResearchForge AI Engine - Report Export & Citation Validation Service.

Generates professional exports in Markdown, DOCX, and PDF formats, and
performs citation verification, coverage analysis, and provenance validation.
"""

import os
import re
import io
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

import docx
from docx.shared import Inches, Pt, RGBColor
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from utils.logger import logger


class ReportExportService:
    """Handles report compilation into Markdown, DOCX, and PDF formats, plus citation auditing."""

    def __init__(self, export_dir: str = "storage/exports"):
        self.export_dir = Path(export_dir)
        self.export_dir.mkdir(parents=True, exist_ok=True)

    def export_markdown(
        self,
        report: Dict[str, Any],
        citations: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Formats the full research report as a standalone Markdown document with structured citations."""
        citations = citations or []
        title = report.get("title", "Research Report")
        summary = report.get("executiveSummary", "")
        content = report.get("contentMarkdown", "")
        created_at = report.get("createdAt") or datetime.now(timezone.utc).isoformat()

        lines = [
            f"# {title}",
            "",
            f"> **Generated:** {created_at} | **Report ID:** `{report.get('id', 'N/A')}` | **Version:** {report.get('version', 1)}",
            "",
        ]

        if summary:
            lines.extend([
                "## Executive Summary",
                "",
                summary,
                "",
            ])

        lines.extend([
            content,
            "",
            "---",
            "",
            "## References & Citations",
            "",
        ])

        if citations:
            lines.extend([
                "| # | Citation / Claim | Supporting Evidence | Source / Locator |",
                "|---|---|---|---|",
            ])
            for c in sorted(citations, key=lambda x: x.get("citationNumber", 0)):
                num = c.get("citationNumber", 0)
                claim = (c.get("citationText") or c.get("claim", {}).get("claim") or "General Reference").replace("|", "\\|")
                quote = (c.get("evidence", {}).get("supportingQuote") or "Direct source citation").replace("|", "\\|")
                locator = c.get("locator") or c.get("anchor") or "N/A"
                lines.append(f"| [{num}] | {claim} | {quote} | `{locator}` |")
        else:
            lines.append("*No citations registered for this report.*")

        lines.append("")
        return "\n".join(lines)

    def export_docx(
        self,
        report: Dict[str, Any],
        citations: Optional[List[Dict[str, Any]]] = None,
        filename: Optional[str] = None,
    ) -> Tuple[str, int]:
        """Compiles the report into a styled Word (.docx) document and saves to disk."""
        citations = citations or []
        report_id = report.get("id", "report")
        fname = filename or f"{report_id}_{int(datetime.now().timestamp())}.docx"
        out_path = self.export_dir / fname

        doc = docx.Document()

        # Page setup: 1-inch margins
        for section in doc.sections:
            section.top_margin = Inches(1.0)
            section.bottom_margin = Inches(1.0)
            section.left_margin = Inches(1.0)
            section.right_margin = Inches(1.0)

        # Title
        title_p = doc.add_heading(report.get("title", "Research Report"), level=0)
        title_p.runs[0].font.size = Pt(22)
        title_p.runs[0].font.color.rgb = RGBColor(15, 23, 42)

        # Subtitle metadata
        created_at = str(report.get("createdAt") or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))
        meta_p = doc.add_paragraph()
        meta_p.paragraph_format.space_after = Pt(14)
        run_meta = meta_p.add_run(f"Generated: {created_at}  |  Version: {report.get('version', 1)}  |  Report ID: {report_id}")
        run_meta.font.size = Pt(9.5)
        run_meta.font.italic = True
        run_meta.font.color.rgb = RGBColor(100, 116, 139)

        # Executive Summary Callout Box
        summary = report.get("executiveSummary")
        if summary:
            doc.add_heading("Executive Summary", level=1)
            sum_p = doc.add_paragraph(summary)
            sum_p.paragraph_format.space_after = Pt(12)

        # Main Body - parse Markdown sections into headings and paragraphs
        content = report.get("contentMarkdown", "")
        for block in content.split("\n\n"):
            block = block.strip()
            if not block:
                continue

            if block.startswith("### "):
                doc.add_heading(block[4:].strip(), level=3)
            elif block.startswith("## "):
                doc.add_heading(block[3:].strip(), level=2)
            elif block.startswith("# "):
                doc.add_heading(block[2:].strip(), level=1)
            elif block.startswith("- ") or block.startswith("* "):
                for line in block.split("\n"):
                    if line.startswith("- ") or line.startswith("* "):
                        doc.add_paragraph(line[2:].strip(), style="List Bullet")
            else:
                doc.add_paragraph(block)

        # Citations Section & Table
        doc.add_heading("References & Citations", level=1)
        if citations:
            table = doc.add_table(rows=1, cols=4)
            table.style = "Table Grid"
            hdr_cells = table.rows[0].cells
            hdr_cells[0].text = "#"
            hdr_cells[1].text = "Claim / Statement"
            hdr_cells[2].text = "Supporting Evidence"
            hdr_cells[3].text = "Source Locator"

            for c in sorted(citations, key=lambda x: x.get("citationNumber", 0)):
                row_cells = table.add_row().cells
                row_cells[0].text = str(c.get("citationNumber", ""))
                row_cells[1].text = str(c.get("citationText") or c.get("claim", {}).get("claim") or "General Statement")
                row_cells[2].text = str(c.get("evidence", {}).get("supportingQuote") or "Direct source citation")
                row_cells[3].text = str(c.get("locator") or c.get("anchor") or "N/A")
        else:
            doc.add_paragraph("No citations recorded for this report.")

        doc.save(str(out_path))
        file_size = os.path.getsize(str(out_path))
        logger.info(f"[ReportExport] DOCX generated at {out_path} ({file_size} bytes)")
        return str(out_path), file_size

    def export_pdf(
        self,
        report: Dict[str, Any],
        citations: Optional[List[Dict[str, Any]]] = None,
        filename: Optional[str] = None,
    ) -> Tuple[str, int]:
        """Compiles the report into a styled PDF document and saves to disk."""
        citations = citations or []
        report_id = report.get("id", "report")
        fname = filename or f"{report_id}_{int(datetime.now().timestamp())}.pdf"
        out_path = self.export_dir / fname

        doc = SimpleDocTemplate(
            str(out_path),
            pagesize=letter,
            leftMargin=54,
            rightMargin=54,
            topMargin=54,
            bottomMargin=54,
        )

        styles = getSampleStyleSheet()

        # Custom typography styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Title"],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#0f172a"),
            alignment=0,
            spaceAfter=8,
        )
        meta_style = ParagraphStyle(
            "DocMeta",
            parent=styles["Normal"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=14,
        )
        h1_style = ParagraphStyle(
            "DocH1",
            parent=styles["Heading1"],
            fontSize=15,
            leading=18,
            textColor=colors.HexColor("#1e293b"),
            spaceBefore=14,
            spaceAfter=6,
        )
        h2_style = ParagraphStyle(
            "DocH2",
            parent=styles["Heading2"],
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#334155"),
            spaceBefore=10,
            spaceAfter=4,
        )
        body_style = ParagraphStyle(
            "DocBody",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#1e293b"),
            spaceAfter=8,
        )
        summary_style = ParagraphStyle(
            "DocSummary",
            parent=styles["Normal"],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#0f172a"),
            backColor=colors.HexColor("#f1f5f9"),
            borderPadding=10,
            spaceAfter=12,
        )

        story = []

        # Document Header
        title = report.get("title", "Research Report")
        story.append(Paragraph(title, title_style))
        created_at = str(report.get("createdAt") or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))
        story.append(
            Paragraph(
                f"Generated: {created_at}  |  Version: {report.get('version', 1)}  |  Report ID: {report_id}",
                meta_style,
            )
        )
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=12))

        # Executive Summary
        summary = report.get("executiveSummary")
        if summary:
            story.append(Paragraph("Executive Summary", h1_style))
            story.append(Paragraph(summary, summary_style))

        # Main Body - parse Markdown
        content = report.get("contentMarkdown", "")
        for block in content.split("\n\n"):
            block = block.strip()
            if not block:
                continue

            # Strip markdown markup for PDF formatting
            clean_text = block.replace("<", "&lt;").replace(">", "&gt;")
            if clean_text.startswith("### "):
                story.append(Paragraph(clean_text[4:].strip(), h2_style))
            elif clean_text.startswith("## "):
                story.append(Paragraph(clean_text[3:].strip(), h1_style))
            elif clean_text.startswith("# "):
                story.append(Paragraph(clean_text[2:].strip(), h1_style))
            else:
                story.append(Paragraph(clean_text, body_style))

        # References & Citations
        story.append(Spacer(1, 14))
        story.append(Paragraph("References & Citations", h1_style))

        if citations:
            table_data = [["#", "Claim / Statement", "Supporting Evidence", "Source Locator"]]
            for c in sorted(citations, key=lambda x: x.get("citationNumber", 0)):
                num = str(c.get("citationNumber", ""))
                claim_txt = str(c.get("citationText") or c.get("claim", {}).get("claim") or "General Citation")[:70]
                ev_txt = str(c.get("evidence", {}).get("supportingQuote") or "Direct source citation")[:80]
                loc_txt = str(c.get("locator") or c.get("anchor") or "N/A")[:30]
                table_data.append([num, claim_txt, ev_txt, loc_txt])

            col_widths = [24, 180, 200, 100]
            t = Table(table_data, colWidths=col_widths, repeatRows=1)
            t.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, 0), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                    ("TOPPADDING", (0, 0), (-1, 0), 6),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 1), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ])
            )
            story.append(t)
        else:
            story.append(Paragraph("No citations recorded for this report.", body_style))

        doc.build(story)
        file_size = os.path.getsize(str(out_path))
        logger.info(f"[ReportExport] PDF generated at {out_path} ({file_size} bytes)")
        return str(out_path), file_size

    def validate_citations(
        self,
        content_markdown: str,
        citations: List[Dict[str, Any]],
        registered_claims: Optional[List[Dict[str, Any]]] = None,
        registered_sources: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Validates citations against content tags, detected claims, and registered source provenance."""
        registered_claims = registered_claims or []
        registered_sources = registered_sources or []

        # Find all citation tags in content: e.g. [1], [^1], [1, 2]
        citation_tags = re.findall(r"\[\^?(\d+)\]", content_markdown)
        cited_numbers = set(int(n) for n in citation_tags)

        # Catalog registered citations
        citation_map = {c.get("citationNumber"): c for c in citations if c.get("citationNumber")}
        registered_source_ids = {s.get("id") for s in registered_sources if s.get("id")}
        registered_claim_ids = {cl.get("id") for cl in registered_claims if cl.get("id")}

        issues = []
        dangling_citations = []
        unsupported_tags = []

        # Check: Every tag in content has a corresponding citation record
        for tag_num in sorted(cited_numbers):
            if tag_num not in citation_map:
                unsupported_tags.append(tag_num)
                issues.append({
                    "severity": "WARNING",
                    "type": "MISSING_CITATION_RECORD",
                    "message": f"Citation [{tag_num}] is referenced in markdown body but has no matching citation entry.",
                })

        # Check: Every citation record is actually cited in content
        for num, citation in citation_map.items():
            if num not in cited_numbers:
                dangling_citations.append(num)
                issues.append({
                    "severity": "INFO",
                    "type": "UNUSED_CITATION",
                    "message": f"Citation [{num}] is registered in database but not referenced in markdown body.",
                })

            # Check provenance: evidence/claim linkage
            claim_id = citation.get("claimId")
            if claim_id and registered_claim_ids and claim_id not in registered_claim_ids:
                issues.append({
                    "severity": "ERROR",
                    "type": "INVALID_CLAIM_LINK",
                    "message": f"Citation [{num}] points to unknown claim ID '{claim_id}'.",
                })

        # Calculate coverage score
        total_expected = len(cited_numbers) or 1
        valid_count = sum(1 for n in cited_numbers if n in citation_map)
        coverage_score = round((valid_count / total_expected) * 100.0, 1)

        is_valid = len([i for i in issues if i["severity"] == "ERROR"]) == 0

        return {
            "valid": is_valid,
            "coverage_score": coverage_score,
            "total_cited_in_text": len(cited_numbers),
            "total_registered_citations": len(citations),
            "dangling_citations": dangling_citations,
            "unsupported_tags": unsupported_tags,
            "issues": issues,
        }


# Global report export service instance
report_export_service = ReportExportService()

