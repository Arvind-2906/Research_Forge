"""ResearchForge AI Engine - Document Parser.

Multi-format parser supporting PDF, DOCX, Markdown, and Plain Text files
with metadata and page-level provenance extraction.
"""

import io
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from rag.ingestion.text_cleaner import text_cleaner
from utils.logger import logger


class ParsedPage(BaseModel):
    page_number: int
    text: str


class ParsedDocument(BaseModel):
    title: str
    full_text: str
    mime_type: str
    total_pages: int
    word_count: int
    pages: List[ParsedPage]
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentParser:
    """Parses various binary and text document formats into a normalized structure."""

    async def parse_bytes(
        self,
        content: bytes,
        filename: str,
        mime_type: Optional[str] = None,
    ) -> ParsedDocument:
        """Parses document from raw bytes."""
        ext = filename.lower().split(".")[-1] if "." in filename else ""

        if mime_type == "application/pdf" or ext == "pdf":
            return self._parse_pdf(content, filename)
        elif (
            mime_type
            in (
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/msword",
            )
            or ext == "docx"
        ):
            return self._parse_docx(content, filename)
        elif ext in ("md", "markdown"):
            return self._parse_markdown(content, filename)
        else:
            return self._parse_plain_text(content, filename)

    def _parse_pdf(self, content: bytes, filename: str) -> ParsedDocument:
        """Extracts text and page numbers from PDF bytes using pypdf."""
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(content))
        pages_out: List[ParsedPage] = []
        full_text_parts: List[str] = []

        total_pages = len(reader.pages)
        for idx, page in enumerate(reader.pages, start=1):
            raw = page.extract_text() or ""
            cleaned = text_cleaner.clean(raw)
            if cleaned:
                pages_out.append(ParsedPage(page_number=idx, text=cleaned))
                full_text_parts.append(cleaned)

        full_text = "\n\n".join(full_text_parts)
        meta_info = {}
        if reader.metadata:
            meta_info = {
                "author": reader.metadata.author,
                "creator": reader.metadata.creator,
                "producer": reader.metadata.producer,
                "title": reader.metadata.title,
            }

        title = meta_info.get("title") or text_cleaner.extract_title_candidate(full_text) or filename

        return ParsedDocument(
            title=title,
            full_text=full_text,
            mime_type="application/pdf",
            total_pages=total_pages,
            word_count=len(full_text.split()),
            pages=pages_out,
            metadata=meta_info,
        )

    def _parse_docx(self, content: bytes, filename: str) -> ParsedDocument:
        """Extracts text and headings from DOCX bytes using python-docx."""
        import docx

        doc = docx.Document(io.BytesIO(content))
        full_text_parts: List[str] = []

        for p in doc.paragraphs:
            text = text_cleaner.clean(p.text)
            if text:
                full_text_parts.append(text)

        # Also extract table text
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(text_cleaner.clean(cell.text) for cell in row.cells if cell.text.strip())
                if row_text:
                    full_text_parts.append(row_text)

        full_text = "\n\n".join(full_text_parts)
        title = text_cleaner.extract_title_candidate(full_text) or filename

        return ParsedDocument(
            title=title,
            full_text=full_text,
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            total_pages=1,
            word_count=len(full_text.split()),
            pages=[ParsedPage(page_number=1, text=full_text)],
            metadata={"paragraphs_count": len(doc.paragraphs), "tables_count": len(doc.tables)},
        )

    def _parse_markdown(self, content: bytes, filename: str) -> ParsedDocument:
        """Extracts and normalizes Markdown text."""
        raw = self._decode_bytes(content)
        cleaned = text_cleaner.clean(raw)
        title = text_cleaner.extract_title_candidate(cleaned) or filename

        return ParsedDocument(
            title=title,
            full_text=cleaned,
            mime_type="text/markdown",
            total_pages=1,
            word_count=len(cleaned.split()),
            pages=[ParsedPage(page_number=1, text=cleaned)],
            metadata={"format": "markdown"},
        )

    def _parse_plain_text(self, content: bytes, filename: str) -> ParsedDocument:
        """Extracts and normalizes plain text."""
        raw = self._decode_bytes(content)
        cleaned = text_cleaner.clean(raw)
        title = text_cleaner.extract_title_candidate(cleaned) or filename

        return ParsedDocument(
            title=title,
            full_text=cleaned,
            mime_type="text/plain",
            total_pages=1,
            word_count=len(cleaned.split()),
            pages=[ParsedPage(page_number=1, text=cleaned)],
            metadata={"format": "plain_text"},
        )

    @staticmethod
    def _decode_bytes(content: bytes) -> str:
        """Attempts UTF-8 decoding with fallback to Latin-1 and CP1252."""
        for enc in ("utf-8", "latin-1", "cp1252", "iso-8859-1"):
            try:
                return content.decode(enc)
            except UnicodeDecodeError:
                continue
        return content.decode("utf-8", errors="replace")


document_parser = DocumentParser()

