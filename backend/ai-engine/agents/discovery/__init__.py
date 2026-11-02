"""ResearchForge AI Engine - Discovery Agents Package.
"""

from agents.discovery.web_research_agent import web_research_agent, WebResearchAgent, WebResearchOutput, DiscoveredSourceItem
from agents.discovery.document_research_agent import document_research_agent, DocumentResearchAgent, DocumentResearchOutput, DocumentChunkResult

__all__ = [
    "web_research_agent",
    "WebResearchAgent",
    "WebResearchOutput",
    "DiscoveredSourceItem",
    "document_research_agent",
    "DocumentResearchAgent",
    "DocumentResearchOutput",
    "DocumentChunkResult",
]

