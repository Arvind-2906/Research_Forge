"""ResearchForge AI Engine - Multi-Agent System Package.
"""

from agents.planning import intake_agent, planner_agent, coordinator_agent
from agents.discovery import web_research_agent, document_research_agent
from agents.extraction import source_extraction_agent, evidence_extraction_agent
from agents.verification import verification_agent, contradiction_agent, gap_analysis_agent
from agents.synthesis import synthesis_agent, citation_validation_agent
from agents.reporting import report_generation_agent, quality_review_agent

__all__ = [
    "intake_agent",
    "planner_agent",
    "coordinator_agent",
    "web_research_agent",
    "document_research_agent",
    "source_extraction_agent",
    "evidence_extraction_agent",
    "verification_agent",
    "contradiction_agent",
    "gap_analysis_agent",
    "synthesis_agent",
    "citation_validation_agent",
    "report_generation_agent",
    "quality_review_agent",
]

