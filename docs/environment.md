# ResearchForge Environment Variable Reference

This document catalogs all environment variables used by the Node.js API Gateway and Python AI Engine, including their purpose, defaults, and security classifications.

---

## 1. Global & Shared Variables

| Variable | Type | Default | Required | Security | Description |
|---|---|---|---|---|---|
| `DATABASE_URL` | String | *None* | **Yes** | **Secret** | Neon PostgreSQL connection string with `sslmode=require`. Must support `pgvector`. |
| `REDIS_URL` | String | `redis://localhost:6379` | No | Internal | Redis connection string used for caching, rate limiting, and temporary coordination. |

---

## 2. Node.js API Gateway (`backend/node-server/.env`)

| Variable | Type | Default | Required | Security | Description |
|---|---|---|---|---|---|
| `PORT` | Number | `5000` | No | Public | HTTP port the Express server listens on. |
| `NODE_ENV` | String | `development` | No | Public | Operational environment (`development`, `test`, `production`). In `test`, rate limiters allow testing bypass. |
| `FRONTEND_URL` | String | `http://localhost:3000` | No | Public | Client origin URL allowed by CORS headers and Better Auth redirects. |
| `AI_ENGINE_URL` | String | `http://localhost:8000` | No | Internal | Base URL of the internal Python FastAPI AI Engine. |
| `BETTER_AUTH_SECRET` | String | *None* | **Yes** | **Secret** | Cryptographic key used by Better Auth to sign session tokens and cookies. |
| `BETTER_AUTH_URL` | String | `http://localhost:5000` | No | Public | Canonical base URL for Better Auth authentication callbacks. |
| `INTERNAL_SERVICE_SECRET` | String | `rf_internal_sec_...` | No | **Secret** | Shared pre-shared key for `X-Internal-Service-Key` header between Node and Python. |
| `GITHUB_CLIENT_ID` | String | *Optional* | No | Public | GitHub OAuth Application Client ID. |
| `GITHUB_CLIENT_SECRET` | String | *Optional* | No | **Secret** | GitHub OAuth Application Client Secret. |
| `GOOGLE_CLIENT_ID` | String | *Optional* | No | Public | Google Cloud OAuth Client ID. |
| `GOOGLE_CLIENT_SECRET` | String | *Optional* | No | **Secret** | Google Cloud OAuth Client Secret. |

---

## 3. Python AI Engine (`backend/ai-engine/.env`)

| Variable | Type | Default | Required | Security | Description |
|---|---|---|---|---|---|
| `HOST` | String | `0.0.0.0` | No | Public | Host interface for FastAPI / Uvicorn to bind. |
| `PORT` | Number | `8000` | No | Public | HTTP port for the AI Engine. |
| `ENVIRONMENT` | String | `development` | No | Public | Operational environment (`development`, `test`, `production`). |
| `NODE_BACKEND_URL` | String | `http://localhost:5000` | No | Internal | Base URL of the Node.js API Gateway for status callbacks. |
| `INTERNAL_SERVICE_SECRET` | String | `rf_internal_sec_...` | No | **Secret** | Pre-shared key to validate incoming calls from Node.js Gateway. |
| `GROQ_API_KEY` | String | *None* | **Yes** (or Gemini) | **Secret** | Groq API key providing fast LLM inference. |
| `PRIMARY_REASONING_MODEL` | String | `openai/gpt-oss-120b` | No | Public | Large reasoning model for planning, synthesis, and verification. |
| `LIGHTWEIGHT_TASK_MODEL` | String | `openai/gpt-oss-20b` | No | Public | Faster, lightweight model for classification and extraction. |
| `HUGGINGFACE_API_KEY` | String | *Optional* | No | **Secret** | Hugging Face user access token for model inference / API embeddings. |
| `EMBEDDING_MODEL` | String | `BAAI/bge-small-en-v1.5` | No | Public | Sentence-transformers model producing 384-d embeddings. |
| `EMBEDDING_DIMENSION` | Number | `384` | No | Public | Vector dimensionality matching the PostgreSQL `vector(384)` schema. |
| `TAVILY_API_KEY` | String | *Optional* | No | **Secret** | API key for Tavily Web Search MCP client. |
| `EXA_API_KEY` | String | *Optional* | No | **Secret** | API key for Exa Neural Search MCP client. |
| `FIRECRAWL_API_KEY` | String | *Optional* | No | **Secret** | API key for Firecrawl Web Scraping MCP client. |

---

## 4. Production Security Guidelines

1. **Never Commit Secrets**: Do not commit active `.env` files into Git repositories.
2. **Rotating Keys**: If an API key or `BETTER_AUTH_SECRET` is compromised, regenerate it immediately in provider consoles and update hosting environment secrets.
3. **Internal Key Pairing**: Ensure `INTERNAL_SERVICE_SECRET` matches identically in both `backend/node-server/.env` and `backend/ai-engine/.env`.
4. **Neon SSL**: Always append `?sslmode=require` to `DATABASE_URL` when connecting to Neon.

