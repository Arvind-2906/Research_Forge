"""ResearchForge AI Engine - Synthesis Agents Package.
"""

from agents.synthesis.synthesis_agent import synthesis_agent, ResearchSynthesisAgent, ResearchSynthesisOutput, SynthesisSection
from agents.synthesis.citation_validation_agent import citation_validation_agent, CitationValidationAgent, CitationValidationOutput, ValidatedCitationItem

__all__ = [
    "synthesis_agent",
    "ResearchSynthesisAgent",
    "ResearchSynthesisOutput",
    "SynthesisSection",
    "citation_validation_agent",
    "CitationValidationAgent",
    "CitationValidationOutput",
    "ValidatedCitationItem",
]

