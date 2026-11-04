"""ResearchForge AI Engine - Phase 9 Tests.

Tests for report exports (Markdown, DOCX, PDF, HTML), citation validation & auditing,
Knowledge Graph node and edge management, pgvector semantic search, and neighborhood expansion.
"""

import sys
import os
import asyncio
import pytest
import docx
import pypdf
from httpx import ASGITransport, AsyncClient

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from main import app
from database.connection import db
from config.settings import get_settings
from database.repositories.report_repository import report_repository
from database.repositories.knowledge_graph_repository import knowledge_graph_repository
from services.report_export_service import report_export_service
from services.knowledge_graph_service import knowledge_graph_service


@pytest.fixture
def auth_headers():
    settings = get_settings()
    return {"X-Internal-Service-Key": settings.INTERNAL_SERVICE_SECRET}


async def setup_test_workspace():
    """Seeds test user and workspace for knowledge graph testing."""
    async with db.get_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO "User" (id, name, email, "emailVerified", "createdAt", "updatedAt")
                VALUES ('user_test_kg', 'KG Tester', 'kg_test@example.com', true, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
                """
            )
            await cur.execute(
                """
                INSERT INTO "Workspace" (id, name, "ownerId", "createdAt", "updatedAt")
                VALUES ('ws_test_kg', 'KG Test Workspace', 'user_test_kg', NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
                """
            )


# ==========================================
# 1. Report Export & Formatting Tests
# ==========================================

def test_export_markdown():
    """Verifies standalone Markdown generation with structured citations table."""
    report = {
        "id": "rep_test_md",
        "title": "Quantum Computing in Drug Discovery",
        "executiveSummary": "Quantum simulations reduce drug discovery latency by orders of magnitude.",
        "contentMarkdown": "Molecular docking simulations benefit heavily from QAOA algorithms [1].",
        "version": 1,
    }
    citations = [
        {
            "citationNumber": 1,
            "citationText": "QAOA algorithms accelerate conformational search",
            "locator": "https://nature.com/articles/s41586-023",
            "evidence": {"supportingQuote": "Quantum approximate optimization improves docking precision by 40%."},
        }
    ]

    md = report_export_service.export_markdown(report, citations)
    assert "# Quantum Computing in Drug Discovery" in md
    assert "## Executive Summary" in md
    assert "Molecular docking simulations benefit heavily" in md
    assert "| # | Citation / Claim | Supporting Evidence | Source / Locator |" in md
    assert "[1]" in md
    assert "nature.com" in md


def test_export_docx(tmp_path):
    """Verifies styled Word (.docx) document generation."""
    report = {
        "id": "rep_test_docx",
        "title": "Neural Architectures for Edge Devices",
        "executiveSummary": "Quantized convolutional models achieve sub-10ms inference on microcontrollers.",
        "contentMarkdown": "MobileNetV4 and ShuffleNet variants demonstrate superior latency-accuracy trade-offs [1].",
        "version": 1,
    }
    citations = [
        {
            "citationNumber": 1,
            "citationText": "Sub-10ms latency on Arm Cortex-M55",
            "locator": "arXiv:2403.12345",
            "evidence": {"supportingQuote": "INT8 weights reduce SRAM requirements by 75%."},
        }
    ]

    file_path, file_size = report_export_service.export_docx(report, citations, filename="test_output.docx")
    assert os.path.exists(file_path)
    assert file_size > 0

    doc = docx.Document(file_path)
    text = "\n".join([p.text for p in doc.paragraphs])
    assert "Neural Architectures for Edge Devices" in text
    assert "Executive Summary" in text
    assert len(doc.tables) >= 1


def test_export_pdf(tmp_path):
    """Verifies professional PDF generation via ReportLab."""
    report = {
        "id": "rep_test_pdf",
        "title": "Battery Degradation in Solid-State Electrolytes",
        "executiveSummary": "Dendrite formation remains the primary limiting factor for solid-state cycle life.",
        "contentMarkdown": "Sulfide-based electrolytes show high ionic conductivity at room temperature [1].",
        "version": 1,
    }
    citations = [
        {
            "citationNumber": 1,
            "citationText": "Ionic conductivity exceeds 10^-2 S/cm",
            "locator": "Science 374, 120-125 (2023)",
            "evidence": {"supportingQuote": "Li10GeP2S12 exhibits superionic conduction."},
        }
    ]

    file_path, file_size = report_export_service.export_pdf(report, citations, filename="test_output.pdf")
    assert os.path.exists(file_path)
    assert file_size > 0

    reader = pypdf.PdfReader(file_path)
    assert len(reader.pages) >= 1
    page_text = reader.pages[0].extract_text()
    assert "Battery Degradation" in page_text
    assert "Executive Summary" in page_text


def test_export_html():
    """Verifies standalone HTML export generation."""
    report = {
        "id": "rep_test_html",
        "title": "Photonic Computing Benchmarks",
        "executiveSummary": "Silicon photonics reduces matrix multiplication energy by 90%.",
        "contentMarkdown": "Optical interconnects overcome copper attenuation limitations [1].",
        "version": 1,
    }
    citations = [
        {
            "citationNumber": 1,
            "citationText": "Optical interconnect energy scaling",
            "locator": "https://ieee.org/photonics/2024",
            "evidence": {"supportingQuote": "Sub-picojoule per bit transmission attained."},
        }
    ]

    file_path, file_size = report_export_service.export_html(report, citations, filename="test_output.html")
    assert os.path.exists(file_path)
    assert file_size > 0

    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()
    assert "<!DOCTYPE html>" in html
    assert "Photonic Computing Benchmarks" in html
    assert "Silicon photonics reduces matrix" in html
    assert "<table>" in html


# ==========================================
# 2. Citation Validation & Auditing Tests
# ==========================================

def test_validate_citations_perfect_coverage():
    """Verifies citation validation with 100% valid coverage."""
    content = "First finding [1] is substantiated, and second finding [2] follows."
    citations = [
        {"citationNumber": 1, "claimId": "clm_1", "citationText": "Finding 1"},
        {"citationNumber": 2, "claimId": "clm_2", "citationText": "Finding 2"},
    ]
    registered_claims = [{"id": "clm_1"}, {"id": "clm_2"}]

    audit = report_export_service.validate_citations(
        content_markdown=content,
        citations=citations,
        registered_claims=registered_claims,
    )
    assert audit["valid"] is True
    assert audit["coverage_score"] == 100.0
    assert len(audit["dangling_citations"]) == 0
    assert len(audit["unsupported_tags"]) == 0


def test_validate_citations_with_warnings_and_errors():
    """Verifies citation auditing detects missing tags, dangling citations, and invalid claim IDs."""
    # Text cites [1] and [3]
    content = "Statement one [1]. Unrecorded statement [3]."
    # DB has [1] and [2], but [2] is unused in text, and [1] links to a non-existent claim
    citations = [
        {"citationNumber": 1, "claimId": "unknown_claim_id", "citationText": "Citation 1"},
        {"citationNumber": 2, "claimId": "clm_valid", "citationText": "Unused Citation 2"},
    ]
    registered_claims = [{"id": "clm_valid"}]

    audit = report_export_service.validate_citations(
        content_markdown=content,
        citations=citations,
        registered_claims=registered_claims,
    )
    # [3] is missing from DB -> unsupported tag
    assert 3 in audit["unsupported_tags"]
    # [2] is in DB but not cited -> dangling citation
    assert 2 in audit["dangling_citations"]
    # [1] has invalid claim ID -> valid is False due to ERROR
    assert audit["valid"] is False
    assert any(i["type"] == "INVALID_CLAIM_LINK" for i in audit["issues"])


# ==========================================
# 3. Knowledge Graph Database Operations
# ==========================================

@pytest.mark.asyncio
async def test_knowledge_graph_repository_crud():
    """Verifies KnowledgeNode and KnowledgeEdge lifecycle in PostgreSQL."""
    await setup_test_workspace()

    # 1. Create Source Node
    node_a = await knowledge_graph_repository.create_node(
        workspace_id="ws_test_kg",
        name="CRISPR-Cas9",
        node_type="TECHNOLOGY",
        description="Targeted genome editing system derived from bacterial immune mechanisms.",
        metadata={"domain": "biotechnology"},
    )
    assert node_a["id"].startswith("kn_")
    assert node_a["name"] == "CRISPR-Cas9"
    assert node_a["type"] == "TECHNOLOGY"

    # 2. Create Target Node
    node_b = await knowledge_graph_repository.create_node(
        workspace_id="ws_test_kg",
        name="Sickle Cell Disease",
        node_type="CONCEPT",
        description="Monogenic disorder caused by a single point mutation in the HBB gene.",
        metadata={"targetGene": "HBB"},
    )
    assert node_b["id"].startswith("kn_")

    # 3. Create Edge
    edge = await knowledge_graph_repository.create_edge(
        source_node_id=node_a["id"],
        target_node_id=node_b["id"],
        relationship="SUPPORTS",
        description="CRISPR therapies like Casgevy provide curative genetic interventions.",
        weight=0.95,
    )
    assert edge["relationship"] == "SUPPORTS"
    assert edge["weight"] == 0.95

    # 4. Neighborhood Query
    neighborhood = await knowledge_graph_repository.get_neighborhood(node_a["id"])
    assert neighborhood["center"]["id"] == node_a["id"]
    assert len(neighborhood["nodes"]) >= 2
    assert len(neighborhood["edges"]) >= 1

    # 5. Clean up
    await knowledge_graph_repository.delete_edge(edge["id"])
    await knowledge_graph_repository.delete_node(node_a["id"])
    await knowledge_graph_repository.delete_node(node_b["id"])


@pytest.mark.asyncio
async def test_knowledge_graph_service_deduplication_and_search():
    """Verifies node semantic embedding, cosine deduplication, and hybrid search."""
    await setup_test_workspace()

    # Create first node
    node1 = await knowledge_graph_service.add_or_merge_node(
        workspace_id="ws_test_kg",
        name="Transformer Neural Networks",
        node_type="CONCEPT",
        description="Self-attention based deep learning architecture for sequence processing.",
        deduplicate=True,
    )
    assert node1["id"].startswith("kn_")

    # Attempt to create duplicate with high semantic similarity
    node2 = await knowledge_graph_service.add_or_merge_node(
        workspace_id="ws_test_kg",
        name="Transformer Neural Networks",
        node_type="CONCEPT",
        description="Attention-based deep learning sequence model.",
        deduplicate=True,
        similarity_threshold=0.85,
    )
    # Deduplication merges and returns the existing node ID
    assert node2["id"] == node1["id"]

    # Semantic Search
    results = await knowledge_graph_service.search_graph(
        workspace_id="ws_test_kg",
        query="self-attention mechanism in language models",
        limit=5,
    )
    assert len(results) >= 1
    assert any("Transformer" in r["name"] for r in results)

    # Clean up
    await knowledge_graph_repository.delete_node(node1["id"])


# ==========================================
# 4. FastAPI Endpoints Integration
# ==========================================

@pytest.mark.asyncio
async def test_fastapi_reports_and_kg_endpoints(auth_headers):
    """Verifies HTTP endpoints for reports and knowledge graph in FastAPI."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Validate Citations endpoint
        val_res = await client.post(
            "/api/v1/reports/validate-citations",
            json={
                "content_markdown": "Test statement [1] substantiated.",
                "citations": [{"citationNumber": 1, "citationText": "Test Citation"}],
            },
            headers=auth_headers,
        )
        assert val_res.status_code == 200
        val_data = val_res.json()
        assert val_data["success"] is True
        assert val_data["data"]["coverage_score"] == 100.0

        # 2. KG Node Create endpoint
        kg_res = await client.post(
            "/api/v1/kg/nodes",
            json={
                "workspace_id": "ws_test_kg",
                "name": "Superconducting Qubits",
                "type": "TECHNOLOGY",
                "description": "Macroscopic quantum circuits built with Josephson junctions.",
            },
            headers=auth_headers,
        )
        assert kg_res.status_code == 200
        kg_data = kg_res.json()
        assert kg_data["success"] is True
        node_id = kg_data["data"]["id"]

        # 3. KG Search endpoint
        search_res = await client.post(
            "/api/v1/kg/search",
            json={
                "workspace_id": "ws_test_kg",
                "query": "quantum circuits with Josephson junctions",
                "limit": 5,
            },
            headers=auth_headers,
        )
        assert search_res.status_code == 200
        search_data = search_res.json()
        assert search_data["success"] is True
        assert len(search_data["data"]) >= 1

        # Clean up created node
        del_res = await client.delete(f"/api/v1/kg/nodes/{node_id}", headers=auth_headers)
        assert del_res.status_code == 200
