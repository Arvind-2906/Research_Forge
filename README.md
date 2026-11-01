# ResearchForge – Autonomous Research Workspace

ResearchForge is an agentic AI-powered research platform where users can submit research questions. Multiple specialized AI agents collaborate to plan research, discover sources, extract information, verify evidence, and generate structured research reports with citations.

The platform uses LangGraph for agent orchestration, connects to remote Model Context Protocol (MCP) servers via an MCP client, and leverages a high-performance modern full-stack architecture.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │          Frontend (Next.js)          │
                      │   Tailwind CSS / shadcn/ui / React   │
                      └──────────────────┬───────────────────┘
                                         │
                   HTTP / REST           │           SSE / Events
         ┌───────────────────────────────┴───────────────────────────────┐
         ▼                                                               ▼
┌─────────────────────────────────┐                    ┌─────────────────────────────────┐
│     Node.js Backend (Express)   │                    │     AI Engine Backend (FastAPI)  │
│  - Better Auth authentication   │◄── HTTP / Events ──┤  - LangGraph Orchestrator       │
│  - Prisma ORM (Schema Owner)    │                    │  - Agent Teams (Plan, Verify...)│
│  - Zod request validation       │                    │  - Remote MCP Client            │
│  - Core Business API            │                    │  - RAG & Vector Search          │
└────────────────┬────────────────┘                    └────────────────┬────────────────┘
                 │                                                      │
                 │              PostgreSQL (Neon)                       │
                 └──────────────► + pgvector ◄──────────────────────────┘
                                         ▲
                                         │ Cache / Temporary State
                                 ┌───────┴───────┐
                                 │  Redis Cache  │
                                 └───────────────┘
```

---

## Technology Stack

### Frontend (`/frontend`)
- **Framework**: Next.js (App Router, JavaScript)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui design system
- **Icons**: Lucide React
- **Visualization**: React Flow (workflow visualizer), Recharts (data analytics)
- **Language**: JavaScript

### Node.js Backend (`/backend/node-server`)
- **Runtime & Server**: Node.js & Express.js
- **Authentication**: Better Auth
- **Validation**: Zod
- **Database Access & Migrations**: Prisma ORM (Exclusive migration owner)
- **Language**: JavaScript (ESM)

### AI Backend (`/backend/ai-engine`)
- **Framework**: FastAPI (Python)
- **Agent Orchestration**: LangGraph & LangChain
- **Tool Protocol**: Official Python MCP SDK (`mcp`) & `langchain-mcp-adapters` (Client-only)
- **Streaming**: Server-Sent Events (SSE)
- **Models**:
  - Primary Reasoning: Groq `openai/gpt-oss-120b`
  - Lightweight Tasks: Groq `openai/gpt-oss-20b`
  - Embeddings: Hugging Face `BAAI/bge-small-en-v1.5`
- **Data Access**: Lightweight repository layer directly querying Neon (read/write data only)

### Database & Infrastructure
- **Primary Database**: Neon PostgreSQL
- **Vector Search**: pgvector extension (managed via Prisma migrations)
- **Caching**: Redis (temporary coordination and cache only)

---

## Architectural Rules

1. **Service Independence**: Frontend, Node.js backend, and Python AI backend operate independently and can be scaled separately.
2. **Database Migration Ownership**: The Node.js backend (`backend/node-server`) with Prisma ORM **owns all database schema changes and migrations**.
3. **Single Database**: Neon PostgreSQL is the sole primary database for all services.
4. **pgvector Integration**: Vector embeddings use the PostgreSQL `pgvector` extension. Any vector-specific SQL or indexes are maintained via Prisma migration files.
5. **No Migrations in Python**: The Python AI backend connects to Neon via a lightweight repository/data-access layer for research state and vectors; it does not execute schema migrations.
6. **Redis Usage**: Redis is utilized exclusively for ephemeral caching, rate limiting, and temporary inter-service coordination.
7. **MCP Client Only**: Connect only to existing remote MCP servers. No custom MCP servers are hosted within this repository.
8. **Secrets Management**: All API keys, connection strings, and secrets reside in `.env` files and are never committed.
9. **Language Conventions**: JavaScript (not TypeScript) is used for the frontend and Node.js backend; Python 3.12+ is used for the AI engine.

---

## Directory Structure

```text
ResearchForge/
├── frontend/                     # Next.js frontend application
│   ├── public/                   # Static assets (images, icons, logos)
│   ├── src/
│   │   ├── app/                  # App Router pages and routes
│   │   │   ├── (auth)/           # Authentication routes (login, register)
│   │   │   ├── (dashboard)/      # Protected dashboard routes
│   │   │   ├── globals.css       # Tailwind base styles & theme tokens
│   │   │   ├── layout.js         # Root layout
│   │   │   └── page.js           # Home / Landing page
│   │   ├── components/           # UI and domain components
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Utilities, API clients, and constants
│   │   ├── services/             # Client-side services
│   │   ├── context/              # React context providers
│   │   └── types/                # JSDoc / Prop types
│   ├── components.json           # shadcn/ui configuration
│   ├── next.config.js            # Next.js configuration
│   ├── jsconfig.json             # Path alias configuration (@/*)
│   ├── package.json              # Frontend scripts & dependencies
│   └── .env.example              # Frontend environment placeholders
│
├── backend/
│   ├── node-server/              # Express.js backend & API service
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # Central Prisma schema
│   │   │   └── migrations/       # Prisma migration files (pgvector enabled)
│   │   ├── src/
│   │   │   ├── auth/             # Better Auth configuration & handlers
│   │   │   ├── config/           # Server configuration & environment
│   │   │   ├── controllers/      # Route controllers
│   │   │   ├── routes/           # Express API route declarations
│   │   │   ├── middleware/       # Express middlewares (auth, validation, errors)
│   │   │   ├── services/         # Business logic layer
│   │   │   ├── validators/       # Zod validation schemas
│   │   │   ├── utils/            # Helper utilities
│   │   │   ├── constants/        # Application constants
│   │   │   ├── app.js            # Express app assembly
│   │   │   └── server.js         # HTTP server entrypoint
│   │   ├── package.json          # Node server scripts & dependencies
│   │   └── .env.example          # Node server environment placeholders
│   │
│   └── ai-engine/                # Python FastAPI & LangGraph AI backend
│       ├── agents/               # Specialized AI agents
│       │   ├── planning/         # Research planning & breakdown
│       │   ├── discovery/        # Source discovery & search
│       │   ├── extraction/       # Evidence extraction
│       │   ├── verification/     # Fact-checking & verification
│       │   ├── synthesis/        # Cross-source synthesis
│       │   └── reporting/        # Structured report generation
│       ├── graph/                # LangGraph state machine & workflows
│       ├── mcp/                  # Remote MCP client integration & registry
│       ├── tools/                # Search, scraping & academic research tools
│       ├── rag/                  # Ingestion, chunking, retrieval & pipelines
│       ├── embeddings/           # BAAI/bge-small-en-v1.5 embeddings service
│       ├── database/             # Neon PostgreSQL repository & connection
│       ├── services/             # AI backend domain services
│       ├── schemas/              # Pydantic schemas
│       ├── config/               # Settings & environment variables
│       ├── utils/                # Helper functions & logging
│       ├── api/                  # FastAPI routers & dependencies
│       ├── tests/                # Test suites
│       ├── main.py               # FastAPI application entrypoint
│       ├── requirements.txt      # Python dependencies
│       └── .env.example          # AI engine environment placeholders
│
├── docs/                         # Project documentation
│   ├── architecture/             # Architecture specifications & diagrams
│   ├── api/                      # API endpoint definitions & contracts
│   └── project-notes/            # Development logs & decision records
│
├── .gitignore                    # Root git ignore
├── .env.example                  # Consolidated environment variables template
└── README.md                     # Root project documentation
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (v20+ or v24 LTS recommended)
- **Python**: v3.11+ (Python 3.12 recommended)
- **PostgreSQL**: Neon PostgreSQL account with `pgvector` enabled
- **Redis**: Local or cloud-hosted instance
- **API Keys**: Groq and Hugging Face

### 2. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# Accessible at http://localhost:3000
```

### 3. Node.js Backend Setup
```bash
cd backend/node-server
cp .env.example .env
npm install
npx prisma generate
npm run dev
# Accessible at http://localhost:5000
```

### 4. AI Engine Backend Setup
```bash
cd backend/ai-engine
cp .env.example .env
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Accessible at http://localhost:8000
# API documentation at http://localhost:8000/docs
```

