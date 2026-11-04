"""ResearchForge AI Engine - Document Chunking System.

Recursive character chunker preserving sentence and paragraph boundaries,
generating content hashes and attaching page/section provenance.
"""

import hashlib
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from rag.ingestion.document_parser import ParsedDocument


class DocumentChunk(BaseModel):
    chunk_index: int
    content: str
    content_hash: str
    token_count: int
    page_number: Optional[int] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentChunker:
    """Chunks documents into semantic passages while preserving provenance and boundary structure."""

    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 150):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = ["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " "]

    def chunk_document(
        self,
        parsed_doc: ParsedDocument,
        source_id: Optional[str] = None,
        source_url: Optional[str] = None,
    ) -> List[DocumentChunk]:
        """Chunks a parsed document preserving page-level and document metadata."""
        chunks: List[DocumentChunk] = []
        global_index = 0

        # If document has multiple pages, chunk per page to retain page provenance
        if len(parsed_doc.pages) > 1:
            for page in parsed_doc.pages:
                page_chunks = self._split_text(page.text)
                for c_text in page_chunks:
                    c_hash = hashlib.sha256(c_text.encode("utf-8")).hexdigest()
                    meta = {
                        "title": parsed_doc.title,
                        "page_number": page.page_number,
                        "total_pages": parsed_doc.total_pages,
                        "source_url": source_url,
                        "source_id": source_id,
                    }
                    meta.update(parsed_doc.metadata)

                    chunks.append(
                        DocumentChunk(
                            chunk_index=global_index,
                            content=c_text,
                            content_hash=c_hash,
                            token_count=len(c_text.split()),
                            page_number=page.page_number,
                            metadata=meta,
                        )
                    )
                    global_index += 1
        else:
            # Chunk full document
            text_to_chunk = parsed_doc.full_text
            raw_chunks = self._split_text(text_to_chunk)
            for c_text in raw_chunks:
                c_hash = hashlib.sha256(c_text.encode("utf-8")).hexdigest()
                meta = {
                    "title": parsed_doc.title,
                    "page_number": 1,
                    "source_url": source_url,
                    "source_id": source_id,
                }
                meta.update(parsed_doc.metadata)

                chunks.append(
                    DocumentChunk(
                        chunk_index=global_index,
                        content=c_text,
                        content_hash=c_hash,
                        token_count=len(c_text.split()),
                        page_number=1,
                        metadata=meta,
                    )
                )
                global_index += 1

        return chunks

    def chunk_text(
        self,
        text: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[DocumentChunk]:
        """Chunks raw text string."""
        raw_chunks = self._split_text(text)
        meta = metadata or {}
        chunks = []

        for idx, c_text in enumerate(raw_chunks):
            c_hash = hashlib.sha256(c_text.encode("utf-8")).hexdigest()
            chunks.append(
                DocumentChunk(
                    chunk_index=idx,
                    content=c_text,
                    content_hash=c_hash,
                    token_count=len(c_text.split()),
                    page_number=meta.get("page_number", 1),
                    metadata=dict(meta),
                )
            )

        return chunks

    def _split_text(self, text: str) -> List[str]:
        """Recursively splits text using hierarchical separators."""
        if not text or not text.strip():
            return []

        return self._recursive_split(text.strip(), self.separators)

    def _recursive_split(self, text: str, separators: List[str]) -> List[str]:
        """Splits text using the first viable separator, then merges pieces into chunks."""
        if len(text) <= self.chunk_size:
            return [text]

        if not separators:
            # Hard character split if no separators left
            return [text[i : i + self.chunk_size] for i in range(0, len(text), self.chunk_size - self.chunk_overlap)]

        sep = separators[0]
        remaining_seps = separators[1:]
        splits = text.split(sep)

        # Merge splits into chunks under chunk_size
        chunks: List[str] = []
        current_piece = ""

        for s in splits:
            s_clean = s.strip()
            if not s_clean:
                continue

            test_piece = f"{current_piece}{sep}{s_clean}" if current_piece else s_clean

            if len(test_piece) <= self.chunk_size:
                current_piece = test_piece
            else:
                if current_piece:
                    chunks.append(current_piece)
                # If individual piece is larger than chunk_size, recursively split with next separator
                if len(s_clean) > self.chunk_size:
                    sub_chunks = self._recursive_split(s_clean, remaining_seps)
                    chunks.extend(sub_chunks)
                    current_piece = ""
                else:
                    current_piece = s_clean

        if current_piece:
            chunks.append(current_piece)

        # Apply overlap where possible
        if self.chunk_overlap > 0 and len(chunks) > 1:
            overlapped_chunks = []
            for i, ch in enumerate(chunks):
                if i > 0:
                    prev = chunks[i - 1]
                    overlap_text = prev[-self.chunk_overlap :] if len(prev) >= self.chunk_overlap else prev
                    # Avoid duplicated overlap if already present
                    if not ch.startswith(overlap_text):
                        ch = f"{overlap_text} {ch}"
                overlapped_chunks.append(ch)
            return overlapped_chunks

        return chunks


document_chunker = DocumentChunker()

