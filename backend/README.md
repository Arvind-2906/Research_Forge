# ResearchForge Backend Services

This directory contains the dual-backend architecture powering **ResearchForge – Autonomous Research Workspace**.

ResearchForge utilizes a specialized two-tier backend design where the **Node.js API Server** manages client-facing HTTP APIs, authentication, workspace tenancy, and database schema migrations, while the **Python AI Engine** drives multi-agent research orchestration, LangGraph workflows, vector retrieval (RAG), and remote Model Context Protocol (MCP) tool execution.

---

## 1. Dual-Backend Architecture

```
                                  ┌──────────────────────────────┐
                                  │      Frontend (Next.js)      │
                                  └──────────────┬───────────────┘
                                                 │
                             HTTP / REST (JSON)  │  SSE (Events)
                                                 ▼
             ┌───────────────────────────────────────────────────────────────────┐
             │                  Node.js API Server (Express)                     │
             │  - Port: 5000                                                     │
             │  - Authentication: Better Auth (Cookie & Bearer sessions)         │
             │  - Authorization: RBAC & Multi-tenant Workspace Scoping           │
             │  - Database Migration Owner: Prisma ORM (Neon PostgreSQL)         │
             │  - Rate Limiting: Sliding-window limiter                          │
             │  - Real-Time Proxy: Resilient SSE fallback to Neon events         │
             └──────────────────┬─────────────────────────────▲──────────────────┘
                                │                             │
                  Internal HTTP │ (X-Internal-Service-Key)    │ Async Callbacks
                                ▼                             │
             ┌────────────────────────────────────────────────┴──────────────────┐
             │                  Python AI Engine (FastAPI)                       │
             │  - Port: 8000                                                     │
             │  - Agent Orchestration: LangGraph Multi-Agent Workflows           │
             │  - 6 Specialized Agents: Planner, Discovery, Extraction,          │
             │                          Verification, Synthesis, Reporting       │
             │  - Tool Protocol: Remote MCP Clients (Tavily, Exa, Firecrawl, GH) │
             │  - Memory & RAG: Neon pgvector (384-d embeddings)                 │
             │  - Checkpoints & State: LangGraph PostgreSQL checkpointer         │
             │  - Security: SSRF validation, prompt injection sanitizer          │
             └──────────────────┬─────────────────────────────┬──────────────────┘
                                │                             │
                                ▼                             ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                       Neon PostgreSQL Database                              │
    │  - pgvector extension (Cosine distance similarity indexes)                 │
    │  - 19 relational tables (Users, Projects, Runs, Plans, Events, Nodes, etc.) │
    │  - Row-level locking (`SELECT ... FOR UPDATE`) for monotonic sequences     │
    └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```text
backend/
├── node-server/                   # Express.js REST API & Authentication Service
│   ├── prisma/
│   │   ├── schema.prisma          # Central relational schema (Single source of truth)
│   │   └── migrations/            # Version-controlled Prisma migrations (pgvector enabled)
│   ├── src/
│   │   ├── auth/                  # Better Auth configuration and handlers
│   │   ├── config/                # Environment configuration and validation
│   │   ├── controllers/           # HTTP controllers for all domain resources
│   │   ├── middleware/            # Auth, RBAC, Rate Limiting, Error Handling, Secret Scrubbing
│   │   ├── routes/                # Express router declarations
│   │   ├── services/              # Business logic, Prisma client, AI Engine client
│   │   ├── utils/                 # Logger, security validators, SSRF guards
│   │   ├── validators/            # Zod input validation schemas
│   │   ├── app.js                 # Express application configuration
│   │   └── server.js              # HTTP server bootstrap entrypoint
│   ├── tests/                     # Node.js native test suite (`node --test`)
│   ├── package.json               # Dependencies and scripts
│   └── .env.example               # Environment variables template
│
└── ai-engine/                     # Python FastAPI & LangGraph AI Service
    ├── agents/                    # Specialized AI agent implementations
    │   ├── planning/              # Research planning & breakdown agent
    │   ├── discovery/             # Web & source discovery agent
    │   ├── extraction/            # Content & evidence extraction agent
    │   ├── verification/          # Fact-checking & claim verification agent
    │   ├── synthesis/             # Cross-source synthesis & gap analysis agent
    │   └── reporting/             # Markdown, DOCX, PDF, HTML report generator
    ├── api/
    │   ├── routes/                # FastAPI routers (research, mcp, rag, memory, kg, reports)
    │   └── deps.py                # FastAPI dependency injection (DB pool, auth)
    ├── config/                    # Pydantic Settings & environment validation
    ├── database/                  # Asyncpg database connection pool & repositories
    │   ├── connection.py          # Resilient connection pooling with Neon
    │   └── repositories/          # Event, Run, Memory, Vector, Knowledge Graph repos
    ├── embeddings/                # Hugging Face BAAI/bge-small-en-v1.5 embedding service
    ├── graph/                     # LangGraph state machine, nodes, conditional edges
    ├── mcp/                       # Remote Model Context Protocol (MCP) clients
    │   ├── manager.py             # Client registry, tool discovery, and execution wrapper
    │   └── clients/               # Tavily, Exa, Firecrawl, GitHub clients
    ├── rag/                       # Ingestion, chunking, pgvector retrieval pipelines
    ├── schemas/                   # Pydantic data models and API schemas
    ├── services/                  # LLM service (Groq/Gemini), Report export, Knowledge Graph
    ├── utils/                     # Security, SSRF prevention, prompt sanitizer, logging
    ├── tests/                     # Pytest automated test suite
    ├── main.py                    # FastAPI application entrypoint
    ├── requirements.txt           # Python package dependencies
    └── .env.example               # Environment variables template
```

---

## 3. Component Responsibilities

| Dimension | Node.js Server (`node-server`) | AI Engine (`ai-engine`) |
|---|---|---|
| **Port** | `5000` | `8000` |
| **Runtime** | Node.js v20+ / v24 LTS (ESM) | Python 3.12+ |
| **Framework** | Express.js | FastAPI / Uvicorn |
| **Authentication** | Better Auth (Google, GitHub, Email/Pass) | Internal Service Key (`X-Internal-Service-Key`) |
| **Database Role** | **Schema Owner** (Runs Prisma migrations) | **Data Consumer** (Direct async queries via asyncpg) |
| **Client Interaction** | REST APIs, Client-facing SSE proxy | Internal AI endpoints, Direct SSE streaming |
| **Business Logic** | Workspaces, Projects, Roles, Reports, Billing | Multi-Agent Graphs, RAG, Verification, MCP Execution |
| **Vector Search** | Proxies knowledge graph & memory search | Executes 384-d pgvector cosine similarity search |

---

## 4. Quick Start

### 4.1. Prerequisites
- **Node.js**: v20+ or v24 LTS
- **Python**: v3.12+
- **Neon PostgreSQL**: Active database instance with `pgvector` enabled
- **Redis**: Cloud or local instance (optional, fallback to direct streaming)
- **API Keys**: Groq (`GROQ_API_KEY`) or Google Gemini (`GEMINI_API_KEY`), Tavily (`TAVILY_API_KEY`)

### 4.2. Running the Node.js API Server
```bash
cd backend/node-server

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Neon DATABASE_URL, BETTER_AUTH_SECRET, etc.

# 3. Generate Prisma client & apply migrations
npx prisma generate
npx prisma migrate deploy

# 4. Start development server
npm run dev
# Server listening at http://localhost:5000
# Health check: http://localhost:5000/health
```

### 4.3. Running the Python AI Engine
```bash
cd backend/ai-engine

# 1. Create and activate virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, GROQ_API_KEY, INTERNAL_SERVICE_KEY, etc.

# 4. Start FastAPI server
uvicorn main:app --reload --port 8000
# Server listening at http://localhost:8000
# Swagger UI docs at http://localhost:8000/docs
# Health check: http://localhost:8000/health
```

---

## 5. Running Automated Tests

Both servers maintain comprehensive automated test suites covering unit logic, integration workflows, security defenses, and concurrency guarantees.

### 5.1. Run Python Test Suite (`pytest`)
```bash
cd backend/ai-engine
.venv\Scripts\pytest.exe -v
# 68 passing tests covering LangGraph orchestration, agents, MCP, RAG, pgvector, and security.
```

### 5.2. Run Node.js Test Suite (`node --test`)
```bash
cd backend/node-server
npm test
# 17 passing test suites covering Better Auth, RBAC, Research Lifecycle, SSE Proxy, BOLA, and Reports.
```

---

## 6. Inter-Service Security

Communication between the Node.js API Gateway and the Python AI Engine is secured via:
1. **Shared Service Key (`X-Internal-Service-Key`)**: All calls between services validate against `INTERNAL_SERVICE_KEY`.
2. **SSRF Defense**: The AI Engine validates all outbound scraping and webhook targets against private, loopback, and cloud metadata IP ranges.
3. **Secret Scrubbing**: Sensitive connection strings, tokens, and passwords are recursively scrubbed from all logs and error responses.
4. **Monotonic Event Sequencing**: Monotonic sequence numbers for research events are guaranteed via row-level locks on `ResearchRun` within explicit transactions (`SELECT ... FOR UPDATE`).

