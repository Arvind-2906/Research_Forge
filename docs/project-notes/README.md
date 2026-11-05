# Project Notes & Architecture Decision Records (ADRs)

This directory tracks Architecture Decision Records (ADRs), implementation notes, and milestone completions for **ResearchForge**.

---

## Architecture Decision Records (ADRs)

### ADR-001: Independent 3-Tier Architecture
- **Decision:** Separate Frontend (Next.js), API Gateway (Node.js/Express), and AI Engine (Python/FastAPI).
- **Rationale:** Allows independent horizontal scaling of IO-bound client APIs vs CPU/GPU/memory-intensive LLM orchestration and RAG pipelines.

### ADR-002: Prisma ORM as Exclusive Database Migration Owner
- **Decision:** Node.js backend owns all Prisma migrations against Neon PostgreSQL; Python AI Engine connects strictly as a data consumer via `asyncpg`.
- **Rationale:** Prevents conflicting DDL migrations and maintains a single authoritative schema definition in `schema.prisma`.

### ADR-003: LangGraph as the Multi-Agent State Machine
- **Decision:** Utilize LangGraph cyclic state graphs with PostgreSQL checkpointing for agent orchestration.
- **Rationale:** Provides native state persistence, iterative gap analysis loops, and pause/resume checkpoints for human-in-the-loop plan approval.

### ADR-004: Remote Model Context Protocol (MCP) Client Architecture
- **Decision:** ResearchForge operates strictly as an MCP client connecting to remote servers (Tavily, Exa, Firecrawl, GitHub) via Streamable HTTP/SSE.
- **Rationale:** Avoids maintenance overhead of custom in-process servers while maximizing dynamic tool federation.

### ADR-005: Dual-Path SSE Streaming with Database Fallback
- **Decision:** The Node.js API Gateway proxies live Server-Sent Events from the AI Engine, but automatically falls back to polling `ResearchEvent` in Neon PostgreSQL if the AI Engine restarts.
- **Rationale:** Guarantees zero dropped progress events and unbroken user experience during microservice redeployments.

### ADR-006: Monotonic Event Sequencing via Row-Level Transaction Locks
- **Decision:** Protect sequence generation in `ResearchEvent` using `SELECT id FROM "ResearchRun" WHERE id = $1 FOR UPDATE;` inside explicit PostgreSQL transactions.
- **Rationale:** Eliminates race conditions across concurrent agent workers and satisfies Neon PgBouncer transaction-mode connection constraints.

---

## Milestone Delivery Summary

| Phase | Description | Status | Verification Detail |
|---|---|---|---|
| **Phase 1** | Project Foundation & Database Setup | Complete | Neon PostgreSQL + `pgvector` initialized with Prisma |
| **Phase 2** | Authentication & Access Control | Complete | Better Auth, RBAC middleware, workspace scoping |
| **Phase 3** | Core Application Business Logic | Complete | Workspaces, Projects, Runs, Plans, Reports APIs |
| **Phase 4** | AI Engine Foundation | Complete | FastAPI microservice, async connection pool, Pydantic schemas |
| **Phase 5** | MCP Integration System | Complete | Tavily, Exa, Firecrawl, GitHub clients with telemetry |
| **Phase 6** | Research Agents & LangGraph Architecture | Complete | Planner, Discovery, Extraction, Verification, Synthesis, Reporting agents |
| **Phase 7** | RAG, Documents & Scoped Memory | Complete | User, workspace, and project memory with 384-d pgvector search |
| **Phase 8** | Real-Time Events & Execution | Complete | Monotonic event sequencing & resilient SSE stream proxy |
| **Phase 9** | Reports, Knowledge Graph & Analytics | Complete | Multi-format exports (PDF/DOCX/HTML), graph deduplication, telemetry |
| **Phase 10** | Testing, Security & Reliability | Complete | SSRF guard, prompt sanitizer, tool clamper, rate limiting, 100% tests |
| **Phase 11** | Documentation & Final Integration | Complete | Complete architecture, API, database, setup, and frontend contracts |
