# ResearchForge Local Development & Setup Guide

This guide walks through configuring and running the ResearchForge dual-backend system locally.

---

## 1. System Prerequisites

Ensure the following runtimes and tools are installed:
- **Node.js**: v20.x LTS or v24.x LTS ([nodejs.org](https://nodejs.org))
- **npm**: v10.x or higher
- **Python**: v3.12.x ([python.org](https://python.org))
- **PostgreSQL**: An active [Neon](https://neon.tech) serverless instance with `pgvector` enabled (or local Docker PostgreSQL with `pgvector`).
- **Redis**: Local Redis instance (`localhost:6379`) or Redis Cloud (optional for local dev).
- **API Keys**:
  - LLM: [Groq](https://console.groq.com) or Google Gemini API key.
  - Search: [Tavily](https://tavily.com) API key.

---

## 2. Repository Layout

```text
ResearchForge/
├── backend/
│   ├── node-server/      # Express API gateway & Prisma schema owner (Port 5000)
│   └── ai-engine/        # Python FastAPI & LangGraph multi-agent service (Port 8000)
├── frontend/             # Next.js frontend application (Port 3000)
├── docs/                 # Architectural and API documentation
└── README.md
```

---

## 3. Step-by-Step Setup

### Step 3.1: Configure Database (Neon PostgreSQL)
1. Sign up at [neon.tech](https://neon.tech) and create a new project.
2. Under **Extensions**, ensure `vector` is enabled.
3. Copy your Pooled or Direct connection string. It will look similar to:
   ```text
   postgresql://user:password@ep-sample-pool.neon.tech/neondb?sslmode=require
   ```

---

### Step 3.2: Set Up the Node.js API Server
Open a terminal and navigate to `backend/node-server`:

```bash
cd backend/node-server

# 1. Install dependencies
npm install

# 2. Configure environment file
cp .env.example .env
```

Open `.env` in your editor and configure:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@ep-sample-pool.neon.tech/neondb?sslmode=require"
FRONTEND_URL="http://localhost:3000"
AI_ENGINE_URL="http://localhost:8000"
BETTER_AUTH_SECRET="generate_a_random_32_character_string_here"
BETTER_AUTH_URL="http://localhost:5000"
INTERNAL_SERVICE_SECRET="researchforge-internal-service-secret"
REDIS_URL="redis://localhost:6379"
```

Apply migrations and generate Prisma client:
```bash
# Generate Prisma JavaScript Client
npx prisma generate

# Apply all database migrations to Neon
npx prisma migrate deploy
```

Start the Node.js server:
```bash
npm run dev
```
The server will start listening at `http://localhost:5000`.

---

### Step 3.3: Set Up the Python AI Engine
Open a second terminal and navigate to `backend/ai-engine`:

```bash
cd backend/ai-engine

# 1. Create a virtual environment with Python 3.12
python -m venv .venv

# 2. Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (CMD):
.venv\Scripts\activate.bat
# Linux / macOS:
# source .venv/bin/activate

# 3. Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 4. Configure environment file
cp .env.example .env
```

Open `.env` in `backend/ai-engine` and set:
```env
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
DATABASE_URL="postgresql://user:password@ep-sample-pool.neon.tech/neondb?sslmode=require"
NODE_BACKEND_URL="http://localhost:5000"
INTERNAL_SERVICE_SECRET="researchforge-internal-service-secret"
GROQ_API_KEY="gsk_your_groq_api_key_here"
TAVILY_API_KEY="tvly_your_tavily_api_key_here"
PRIMARY_REASONING_MODEL="openai/gpt-oss-120b"
LIGHTWEIGHT_TASK_MODEL="openai/gpt-oss-20b"
```

Start the FastAPI application:
```bash
uvicorn main:app --reload --port 8000
```
The AI Engine will start listening at `http://localhost:8000`.

---

## 4. Verifying Health & Readiness

In a third terminal or browser, verify both services are running and connected to the database:

### Check Node.js API Gateway:
```bash
curl http://localhost:5000/health
# Output: {"status":"ok","timestamp":"2026-11-04T..."}

curl http://localhost:5000/ready
# Output: {"status":"ready","database":"connected"}
```

### Check Python AI Engine:
```bash
curl http://localhost:8000/health
# Output: {"status":"healthy","database":"connected"}

# Explore Interactive Swagger UI:
# Navigate to: http://localhost:8000/docs
```

---

## 5. Troubleshooting Common Pitfalls

| Issue | Cause | Solution |
|---|---|---|
| `PrismaClientInitializationError` | Neon requires SSL encryption | Verify `?sslmode=require` is present at the end of `DATABASE_URL`. |
| `FastAPI: 403 Forbidden` on internal endpoints | Mismatched secret key | Ensure `INTERNAL_SERVICE_SECRET` in `node-server/.env` matches `INTERNAL_SERVICE_SECRET` in `ai-engine/.env`. |
| `asyncpg.exceptions.InvalidPasswordError` | URL encoding in password | If your Neon password contains special characters (`@`, `#`, `%`), URL-encode them. |
| `TypeError: Unknown field sourceEdges` | Stale Prisma generation | Run `npx prisma generate` in `backend/node-server`. |
| Python virtual environment permission error on Windows | PowerShell execution policy | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` before activating `.venv`. |

