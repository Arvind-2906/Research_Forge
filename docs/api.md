# ResearchForge API Specification

**Version:** 1.0.0  
**Base URLs:**
- **Node.js Gateway:** `http://localhost:5000` (Production: `https://api.researchforge.ai`)
- **FastAPI AI Engine:** `http://localhost:8000` (Internal)

---

## 1. Authentication & Common Headers

### 1.1. Client-Facing Authentication (Node.js Gateway)
All requests to protected Node.js endpoints require either:
- **Session Cookie**: Managed automatically by Better Auth (`better-auth.session_token`).
- **Authorization Header**:
  ```http
  Authorization: Bearer <session_token>
  ```

### 1.2. Workspace Context Header
Endpoints scoped to a specific workspace accept the workspace ID via the header:
```http
x-workspace-id: <workspace_cuid>
```

### 1.3. Internal Inter-Service Key (AI Engine)
Calls directly to the Python AI Engine or internal webhooks require:
```http
X-Internal-Service-Key: <INTERNAL_SERVICE_KEY>
```

### 1.4. Standard Response Envelope
All Node.js responses conform to the standard JSON structure:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 2. Node.js API Gateway Endpoints

### 2.1. Authentication (`/api/auth/*`)
Handled by Better Auth.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/sign-up/email` | Public | Register user with email, password, and name |
| `POST` | `/api/auth/sign-in/email` | Public | Sign in user with email and password |
| `GET` | `/api/auth/get-session` | Session | Retrieve active user session and user profile |
| `POST` | `/api/auth/sign-out` | Session | Invalidate active session and clear cookies |
| `GET` | `/api/auth/oauth/:provider` | Public | Initiate OAuth login (`google`, `github`) |

### 2.2. Users (`/api/users/*`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/me` | User | Retrieve current user profile and workspaces |
| `PATCH` | `/api/users/me` | User | Update user display name, avatar, or preferences |

### 2.3. Workspaces (`/api/workspaces/*`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/workspaces` | User | List all workspaces where user is a member |
| `POST` | `/api/workspaces` | User | Create a new workspace (creator becomes `OWNER`) |
| `GET` | `/api/workspaces/:workspaceId` | Member | Get workspace details and settings |
| `PATCH` | `/api/workspaces/:workspaceId` | Admin | Update workspace name or configuration |
| `DELETE` | `/api/workspaces/:workspaceId` | Owner | Delete workspace and cascade delete assets |
| `GET` | `/api/workspaces/:workspaceId/members` | Member | List members and their roles |
| `POST` | `/api/workspaces/:workspaceId/members` | Admin | Invite/add a member to the workspace |
| `PATCH` | `/api/workspaces/:workspaceId/members/:memberId` | Admin | Update a member's role (`ADMIN`, `MEMBER`) |
| `DELETE` | `/api/workspaces/:workspaceId/members/:memberId` | Admin | Remove a member from the workspace |

### 2.4. Research Projects (`/api/projects/*`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/projects` | Member | List projects in workspace (supports `?page=1&limit=20`) |
| `POST` | `/api/projects` | Member | Create a new research project |
| `GET` | `/api/projects/:projectId` | Member | Get project details, run counts, and metadata |
| `PATCH` | `/api/projects/:projectId` | Member | Update project title, description, or tags |
| `DELETE` | `/api/projects/:projectId` | Admin | Archive or delete project |

### 2.5. Research Runs (`/api/research/*`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/research/projects/:projectId/runs` | Member | List all research runs in a project |
| `POST` | `/api/research/runs` | Member | Initiate a new research run |
| `GET` | `/api/research/runs/:runId` | Member | Get run status, timestamps, and findings count |
| `POST` | `/api/research/runs/:runId/plan` | Member | Trigger Planner Agent to generate research plan |
| `POST` | `/api/research/runs/:runId/approve-plan` | Member | Human approval of plan; starts agent execution |
| `POST` | `/api/research/runs/:runId/pause` | Member | Pause active research execution |
| `POST` | `/api/research/runs/:runId/resume` | Member | Resume paused research execution |
| `POST` | `/api/research/runs/:runId/cancel` | Member | Cancel research run execution |
| `GET` | `/api/research/runs/:runId/events` | Member | **Server-Sent Events (SSE)** stream of live events |

### 2.6. Reports & Exports (`/api/reports/*`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/reports/runs/:runId` | Member | Retrieve synthesized research report and sections |
| `POST` | `/api/reports/runs/:runId/export` | Member | Export report (`PDF`, `DOCX`, `MARKDOWN`, `HTML`) |
| `GET` | `/api/reports/exports/:exportId` | Member | Get status and download URL for exported report |
| `POST` | `/api/reports/runs/:runId/validate-citations` | Member | Validate citation footnotes against verified sources |

### 2.7. Knowledge Graph (`/api/knowledge-graph/*`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/knowledge-graph/workspace/:workspaceId` | Member | Retrieve all nodes and edges for visualization |
| `POST` | `/api/knowledge-graph/nodes` | Member | Create a new knowledge node |
| `POST` | `/api/knowledge-graph/edges` | Member | Connect two nodes with a typed relationship |
| `POST` | `/api/knowledge-graph/search` | Member | Semantic pgvector similarity search over graph nodes |

### 2.8. Analytics (`/api/analytics/*`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/analytics/workspace/:workspaceId` | Member | Aggregated metrics: total runs, tokens, tool calls |
| `GET` | `/api/analytics/runs/:runId` | Member | Per-run token consumption, agent timings, latency |
| `GET` | `/api/analytics/mcp` | Member | MCP server latencies, call counts, failure rates |

### 2.9. Health & Readiness

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Returns `{ status: "ok", timestamp: "..." }` |
| `GET` | `/ready` | Public | Returns `{ status: "ready", database: "connected" }` |

---

## 3. Python AI Engine Internal Endpoints (`/api/v1/*`)

All AI Engine endpoints require `X-Internal-Service-Key`.

### 3.1. Research Execution (`/api/v1/research/*`)
- `POST /api/v1/research/start`: Initiates LangGraph workflow execution.
- `POST /api/v1/research/plan`: Invokes Planner Agent to generate a structured `ResearchPlan`.
- `POST /api/v1/research/{run_id}/approve-plan`: Approves plan and resumes graph execution.
- `POST /api/v1/research/{run_id}/pause`: Pauses active execution thread.
- `POST /api/v1/research/{run_id}/resume`: Resumes paused execution thread.
- `POST /api/v1/research/{run_id}/cancel`: Cancels execution and records state checkpoint.
- `GET /api/v1/research/{run_id}/events`: Direct Server-Sent Events stream from AI Engine.
- `GET /api/v1/research/{run_id}/status`: Current graph state, active node, and iteration count.

### 3.2. Report Export & Verification (`/api/v1/reports/*`)
- `POST /api/v1/reports/{run_id}/export`: Compiles report to Markdown, DOCX, PDF, or HTML.
- `POST /api/v1/reports/{run_id}/validate-citations`: Verifies inline citation references.

### 3.3. Knowledge Graph Engine (`/api/v1/knowledge-graph/*`)
- `POST /api/v1/knowledge-graph/nodes`: Ingests node with automated 384-d vector embedding.
- `POST /api/v1/knowledge-graph/edges`: Links nodes with relationship and weight.
- `POST /api/v1/knowledge-graph/search`: 384-dimensional pgvector cosine similarity search.

### 3.4. RAG & Document Ingestion (`/api/v1/rag/*`)
- `POST /api/v1/rag/ingest`: Chunks document text and stores pgvector embeddings.
- `POST /api/v1/rag/search`: Cosine similarity search over document chunks.

### 3.5. Model Context Protocol (`/api/v1/mcp/*`)
- `GET /api/v1/mcp/servers`: Discovered remote MCP servers and connection status.
- `GET /api/v1/mcp/tools`: Registered tool schemas across all active MCP servers.
- `POST /api/v1/mcp/execute`: Direct tool execution with output clamping and SSRF guards.

