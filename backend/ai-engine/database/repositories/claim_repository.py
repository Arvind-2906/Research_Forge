"""ResearchForge AI Engine - Research Claim & Evidence Repository.

Direct async repository for ResearchClaim, Evidence, and ClaimEvidence entities.
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from psycopg.rows import dict_row

from database.connection import db
from utils.id_generator import generate_cuid
from utils.logger import logger


class ClaimRepository:
    """Provides database operations for ResearchClaim, Evidence, and ClaimEvidence."""

    async def create_claim(
        self,
        run_id: str,
        claim: str,
        explanation: Optional[str] = None,
        confidence: Optional[float] = None,
        status: str = "PENDING",
    ) -> Dict[str, Any]:
        """Creates a new ResearchClaim record."""
        claim_id = generate_cuid("clm_")
        now = datetime.now(timezone.utc)

        query = """
            INSERT INTO "ResearchClaim" (
                id, claim, explanation, confidence, status, "runId", "createdAt", "updatedAt"
            )
            VALUES (%s, %s, %s, %s, %s::"VerificationStatus", %s, %s, %s)
            RETURNING id, claim, explanation, confidence, status, "runId", "createdAt", "updatedAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (claim_id, claim, explanation, confidence, status, run_id, now, now),
                )
                return await cur.fetchone()

    async def update_claim_status(
        self,
        claim_id: str,
        status: str,
        confidence: Optional[float] = None,
        explanation: Optional[str] = None,
    ) -> bool:
        """Updates claim verification status and confidence score."""
        now = datetime.now(timezone.utc)
        query = """
            UPDATE "ResearchClaim"
            SET status = %s::"VerificationStatus",
                confidence = COALESCE(%s, confidence),
                explanation = COALESCE(%s, explanation),
                "updatedAt" = %s
            WHERE id = %s
        """
        async with db.get_connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(query, (status, confidence, explanation, now, claim_id))
                return cur.rowcount > 0

    async def create_evidence(
        self,
        snapshot_id: str,
        supporting_quote: str,
        confidence: float = 0.5,
        location: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates an Evidence snippet linked to a SourceSnapshot."""
        evidence_id = generate_cuid("evi_")
        now = datetime.now(timezone.utc)

        query = """
            INSERT INTO "Evidence" (
                id, "supportingQuote", location, confidence, "snapshotId", "createdAt"
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, "supportingQuote", location, confidence, "snapshotId", "createdAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (evidence_id, supporting_quote, location, confidence, snapshot_id, now),
                )
                return await cur.fetchone()

    async def link_claim_evidence(
        self,
        claim_id: str,
        evidence_id: str,
        relationship: str = "SUPPORTS",
        explanation: Optional[str] = None,
        confidence: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Creates a ClaimEvidence join record linking claim and evidence."""
        link_id = generate_cuid("cle_")
        now = datetime.now(timezone.utc)

        query = """
            INSERT INTO "ClaimEvidence" (
                id, "claimId", "evidenceId", relationship, explanation, confidence, "createdAt"
            )
            VALUES (%s, %s, %s, %s::"EvidenceRelationship", %s, %s, %s)
            ON CONFLICT ("claimId", "evidenceId") DO UPDATE
            SET relationship = EXCLUDED.relationship,
                explanation = COALESCE(EXCLUDED.explanation, "ClaimEvidence".explanation),
                confidence = COALESCE(EXCLUDED.confidence, "ClaimEvidence".confidence)
            RETURNING id, "claimId", "evidenceId", relationship, explanation, confidence, "createdAt"
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    query,
                    (link_id, claim_id, evidence_id, relationship, explanation, confidence, now),
                )
                return await cur.fetchone()

    async def get_claims_with_evidence(self, run_id: str) -> List[Dict[str, Any]]:
        """Fetches all claims for a run with their linked evidence passages."""
        claims_query = """
            SELECT id, claim, explanation, confidence, status, "runId", "createdAt", "updatedAt"
            FROM "ResearchClaim"
            WHERE "runId" = %s
            ORDER BY "createdAt" ASC
        """
        evidence_query = """
            SELECT ce.id AS "linkId", ce."claimId", ce.relationship, ce.confidence AS "linkConfidence",
                   e.id AS "evidenceId", e."supportingQuote", e.location,
                   s.id AS "sourceId", s.url AS "sourceUrl", s.title AS "sourceTitle"
            FROM "ClaimEvidence" ce
            JOIN "Evidence" e ON ce."evidenceId" = e.id
            JOIN "SourceSnapshot" sn ON e."snapshotId" = sn.id
            JOIN "ResearchSource" s ON sn."sourceId" = s.id
            WHERE ce."claimId" = ANY(%s)
        """
        async with db.get_connection() as conn:
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(claims_query, (run_id,))
                claims = await cur.fetchall()

                if not claims:
                    return []

                claim_ids = [c["id"] for c in claims]
                await cur.execute(evidence_query, (claim_ids,))
                evidence_list = await cur.fetchall()

                evidence_map: Dict[str, List[Dict[str, Any]]] = {}
                for ev in evidence_list:
                    evidence_map.setdefault(ev["claimId"], []).append(ev)

                for claim_item in claims:
                    claim_item["evidence"] = evidence_map.get(claim_item["id"], [])

                return claims


# Global claim repository instance
claim_repository = ClaimRepository()
