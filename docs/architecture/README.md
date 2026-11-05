# Architecture Documentation Index

This directory provides architectural blueprints, component specifications, and interaction patterns for **ResearchForge**.

## Core Architectural Documents
- [System Architecture Specification (Complete)](file:///C:/Arvind/Reasearch_Forge/docs/architecture.md)
- [Agent Workflow & State Machine](file:///C:/Arvind/Reasearch_Forge/docs/agent-workflow.md)
- [Database Schema & pgvector Guide](file:///C:/Arvind/Reasearch_Forge/docs/database.md)
- [MCP Integration Architecture](file:///C:/Arvind/Reasearch_Forge/docs/mcp-integration.md)
- [Frontend Integration Contract](file:///C:/Arvind/Reasearch_Forge/docs/frontend-integration-contract.md)

## Key Architectural Principles
1. **Dual-Backend Topology**: Node.js Express API gateway (Port 5000) + Python FastAPI AI Engine (Port 8000).
2. **Single Database Owner**: Neon PostgreSQL with `pgvector` managed exclusively by Prisma ORM migrations in Node.js.
3. **Resilient Streaming**: Proxied Server-Sent Events with automated PostgreSQL fallback.
4. **Security in Depth**: SSRF URL validation, recursive secret scrubbing, sliding-window rate limiting, and row-level sequence locking.
