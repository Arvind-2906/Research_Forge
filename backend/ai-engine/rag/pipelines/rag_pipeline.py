"""ResearchForge AI Engine - End-to-End RAG Pipeline.

Coordinates multi-format document parsing, semantic chunking, batch vector embedding,
persistent pgvector storage, and context assembly with source provenance.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from rag.ingestion.document_parser import document_parser, ParsedDocument
from rag.chunking.chunker import document_chunker, DocumentChunk
from rag.retrieval.vector_search import vector_search_service, SearchRequest, RetrievalResult
from embeddings.embedding_service import embedding_service
from database.repositories import source_repository, event_repository
from utils.logger import logger


class IngestionResult(BaseModel):
    source_id: str
    snapshot_id: str
    title: str
    total_pages: int
    total_chunks: int
    total_words: int
    mime_type: str


class AssembledContext(BaseModel):
    query: str
    formatted_context: str
    sources_cited: List[Dict[str, Any]]
    chunks: List[RetrievalResult]


class RAGPipeline:
    """Orchestrates document ingestion and retrieval augmented generation workflows."""

    async def ingest_document(
        self,
        content: bytes,
        filename: str,
        workspace_id: str,
        project_id: Optional[str] = None,
        run_id: Optional[str] = None,
        mime_type: Optional[str] = None,
    ) -> IngestionResult:
        """Parses, chunks, embeds, and stores a document in Neon PostgreSQL."""
        logger.info(f"[RAGPipeline] Ingesting document '{filename}' ({len(content)} bytes) for workspace {workspace_id}")

        # 1. Parse document bytes (PDF, DOCX, MD, TXT)
        parsed_doc: ParsedDocument = await document_parser.parse_bytes(
            content=content,
            filename=filename,
            mime_type=mime_type,
        )

        # 2. Create or get ResearchSource in Neon PostgreSQL
        canonical_url = f"doc://{workspace_id}/{filename}"
        db_source = await source_repository.get_or_create_source(
            workspace_id=workspace_id,
            url=canonical_url,
            title=parsed_doc.title,
            source_type="DOCUMENT",
            metadata={
                "filename": filename,
                "mime_type": parsed_doc.mime_type,
                "total_pages": parsed_doc.total_pages,
                "project_id": project_id,
            },
        )
        source_id = db_source["id"]

        # Link to run if provided
        if run_id:
            await source_repository.link_run_source(run_id=run_id, source_id=source_id)

        # 3. Create SourceSnapshot
        db_snapshot = await source_repository.create_snapshot(
            source_id=source_id,
            content=parsed_doc.full_text,
            title=parsed_doc.title,
            metadata={"pages": parsed_doc.total_pages, "words": parsed_doc.word_count},
        )
        snapshot_id = db_snapshot["id"]

        # 4. Chunk document
        chunks: List[DocumentChunk] = document_chunker.chunk_document(
            parsed_doc=parsed_doc,
            source_id=source_id,
            source_url=canonical_url,
        )

        if chunks:
            # 5. Generate embeddings in batch (384 dimensions)
            chunk_texts = [c.content for c in chunks]
            embeddings = await embedding_service.embed_documents(chunk_texts)

            # 6. Store chunks in SourceChunk table
            for chunk, emb in zip(chunks, embeddings):
                await source_repository.create_chunk(
                    snapshot_id=snapshot_id,
                    chunk_index=chunk.chunk_index,
                    content=chunk.content,
                    content_hash=chunk.content_hash,
                    token_count=chunk.token_count,
                    metadata=chunk.metadata,
                    embedding=emb,
                    embedding_model="BAAI/bge-small-en-v1.5",
                )

        logger.info(f"[RAGPipeline] Ingestion complete for '{filename}': {len(chunks)} chunks stored.")

        # Emit audit event if run_id was provided
        if run_id:
            await event_repository.create_event(
                run_id=run_id,
                event_type="DOCUMENT_INGESTED",
                message=f"Ingested document '{filename}' into knowledge store ({len(chunks)} chunks)",
                agent_name="RAGPipeline",
                payload={"source_id": source_id, "snapshot_id": snapshot_id, "chunks": len(chunks)},
            )

        return IngestionResult(
            source_id=source_id,
            snapshot_id=snapshot_id,
            title=parsed_doc.title,
            total_pages=parsed_doc.total_pages,
            total_chunks=len(chunks),
            total_words=parsed_doc.word_count,
            mime_type=parsed_doc.mime_type,
        )

    async def retrieve_context(
        self,
        query: str,
        workspace_id: Optional[str] = None,
        project_id: Optional[str] = None,
        run_id: Optional[str] = None,
        top_k: int = 5,
    ) -> AssembledContext:
        """Retrieves and formats relevant passages with explicit source attribution."""
        search_req = SearchRequest(
            query=query,
            workspace_id=workspace_id,
            project_id=project_id,
            run_id=run_id,
            top_k=top_k,
            min_similarity=0.15,
        )

        chunks = await vector_search_service.search(search_req)

        context_lines: List[str] = []
        sources_cited: List[Dict[str, Any]] = []
        seen_sources = set()

        for idx, c in enumerate(chunks, 1):
            page_info = f" (p. {c.page_number})" if c.page_number else ""
            context_lines.append(
                f"[{idx}] Source: {c.source_title}{page_info} ({c.source_url})\n{c.content}\n"
            )

            if c.source_id not in seen_sources:
                seen_sources.add(c.source_id)
                sources_cited.append({
                    "source_id": c.source_id,
                    "title": c.source_title,
                    "url": c.source_url,
                })

        formatted_context = "\n---\n".join(context_lines)

        return AssembledContext(
            query=query,
            formatted_context=formatted_context,
            sources_cited=sources_cited,
            chunks=chunks,
        )


rag_pipeline = RAGPipeline()

