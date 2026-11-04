"""ResearchForge AI Engine - Knowledge Graph Service.

Orchestrates knowledge node creation, automatic 384-d semantic embedding,
deduplication via cosine similarity, graph neighborhood expansion, and
automatic population from research run outputs (claims, evidence, sources).
"""

from typing import List, Dict, Any, Optional
from embeddings.embedding_service import embedding_service
from database.repositories.knowledge_graph_repository import knowledge_graph_repository
from database.repositories.claim_repository import claim_repository
from database.repositories.source_repository import source_repository
from database.repositories.report_repository import report_repository
from database.repositories.run_repository import run_repository
from utils.logger import logger


class KnowledgeGraphService:
    """Provides high-level graph management and research run synthesis."""

    async def add_or_merge_node(
        self,
        workspace_id: str,
        name: str,
        node_type: str = "CONCEPT",
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        deduplicate: bool = True,
        similarity_threshold: float = 0.90,
    ) -> Dict[str, Any]:
        """Creates a knowledge node with semantic embedding, deduplicating against existing nodes."""
        text_for_embedding = f"{name}: {description}" if description else name
        embedding = await embedding_service.embed_query(text_for_embedding)

        if deduplicate:
            existing = await knowledge_graph_repository.find_duplicate_node(
                workspace_id=workspace_id,
                name=name,
                node_type=node_type,
                query_embedding=embedding,
                similarity_threshold=similarity_threshold,
            )
            if existing:
                logger.info(f"[KG] Merging node '{name}' with existing node '{existing['id']}'")
                # Update description / metadata if richer
                updated_desc = description or existing.get("description")
                merged_meta = {**(existing.get("metadata") or {}), **(metadata or {})}
                updated = await knowledge_graph_repository.update_node(
                    node_id=existing["id"],
                    description=updated_desc,
                    metadata=merged_meta,
                    embedding=embedding,
                )
                return updated or existing

        node = await knowledge_graph_repository.create_node(
            workspace_id=workspace_id,
            name=name,
            node_type=node_type,
            description=description,
            metadata=metadata,
            embedding=embedding,
            embedding_model="sentence-transformers/all-MiniLM-L6-v2",
        )
        return node

    async def search_graph(
        self,
        workspace_id: str,
        query: str,
        node_type: Optional[str] = None,
        limit: int = 20,
        min_similarity: float = 0.30,
    ) -> List[Dict[str, Any]]:
        """Hybrid semantic + keyword search across knowledge nodes."""
        query_embedding = await embedding_service.embed_query(query)
        results = await knowledge_graph_repository.search_nodes_semantic(
            workspace_id=workspace_id,
            query_embedding=query_embedding,
            limit=limit,
            min_similarity=min_similarity,
            node_type=node_type,
        )

        # If semantic results are few, supplement with keyword matches
        if len(results) < limit:
            keyword_nodes = await knowledge_graph_repository.list_nodes(
                workspace_id=workspace_id,
                node_type=node_type,
                search=query,
                limit=limit - len(results),
            )
            seen_ids = {n["id"] for n in results}
            for kn in keyword_nodes:
                if kn["id"] not in seen_ids:
                    kn["similarity"] = 0.5
                    results.append(kn)

        return results

    async def populate_from_run(self, run_id: str, workspace_id: str) -> Dict[str, Any]:
        """Auto-populates knowledge graph from claims, sources, and topic of a completed run."""
        run = await run_repository.get_run_by_id(run_id)
        if not run:
            raise ValueError(f"Research run '{run_id}' not found.")

        # 1. Create a root Topic node for the research question
        topic_title = run.get("question") or "Research Topic"
        topic_node = await self.add_or_merge_node(
            workspace_id=workspace_id,
            name=topic_title[:120],
            node_type="TOPIC",
            description=run.get("question"),
            metadata={"runId": run_id, "projectId": run.get("projectId")},
        )

        created_nodes = [topic_node["id"]]
        created_edges = []

        # 2. Extract and create SOURCE nodes
        sources = await source_repository.get_sources_by_run(run_id)
        source_node_map = {}
        for s in sources:
            src_name = s.get("title") or s.get("url") or "External Source"
            src_node = await self.add_or_merge_node(
                workspace_id=workspace_id,
                name=src_name[:120],
                node_type="SOURCE",
                description=f"Source URL: {s.get('url', 'N/A')}",
                metadata={"sourceId": s.get("id"), "url": s.get("url"), "runId": run_id},
            )
            source_node_map[s["id"]] = src_node["id"]
            created_nodes.append(src_node["id"])

            # Link TOPIC -> SOURCE (REFERENCES)
            edge = await knowledge_graph_repository.create_edge(
                source_node_id=topic_node["id"],
                target_node_id=src_node["id"],
                relationship="REFERENCES",
                description="Source referenced during research run",
            )
            created_edges.append(edge["id"])

        # 3. Extract and create CLAIM nodes
        claims = await claim_repository.get_claims_by_run(run_id)
        for c in claims:
            claim_text = c.get("claim", "")
            claim_status = c.get("status", "VERIFIED")
            claim_node = await self.add_or_merge_node(
                workspace_id=workspace_id,
                name=claim_text[:120],
                node_type="CLAIM",
                description=claim_text,
                metadata={
                    "claimId": c.get("id"),
                    "status": claim_status,
                    "confidence": c.get("confidence"),
                    "runId": run_id,
                },
            )
            created_nodes.append(claim_node["id"])

            # Link TOPIC -> CLAIM (PART_OF)
            edge1 = await knowledge_graph_repository.create_edge(
                source_node_id=claim_node["id"],
                target_node_id=topic_node["id"],
                relationship="PART_OF",
                description="Finding discovered under this research topic",
            )
            created_edges.append(edge1["id"])

            # If evidence has sourceId, link CLAIM -> SOURCE (SUPPORTS / CONTRADICTS)
            rel_type = "CONTRADICTS" if claim_status == "CONTRADICTED" else "SUPPORTS"
            evidence_list = await claim_repository.get_evidence_for_claim(c["id"])
            for ev in evidence_list:
                snap_id = ev.get("snapshotId")
                # find corresponding source
                for s in sources:
                    s_id = s.get("id")
                    if s_id in source_node_map:
                        edge2 = await knowledge_graph_repository.create_edge(
                            source_node_id=source_node_map[s_id],
                            target_node_id=claim_node["id"],
                            relationship=rel_type,
                            description=ev.get("supportingQuote") or "Evidence link",
                            weight=float(ev.get("confidence") or 1.0),
                        )
                        created_edges.append(edge2["id"])
                        break

        logger.info(
            f"[KG] Populated graph for run '{run_id}': "
            f"{len(created_nodes)} nodes, {len(created_edges)} edges created/updated."
        )

        return {
            "success": True,
            "run_id": run_id,
            "topic_node_id": topic_node["id"],
            "nodes_count": len(created_nodes),
            "edges_count": len(created_edges),
        }


knowledge_graph_service = KnowledgeGraphService()

