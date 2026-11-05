# ResearchForge Frontend Integration Contract & Developer Handoff Guide

**Target Audience:** Frontend Development Team (Next.js 14+ / React)  
**Backend API Gateway:** `http://localhost:5000` (`NEXT_PUBLIC_API_URL=http://localhost:5000/api`)  
**Specification Version:** 1.0.0  

---

## 1. Authentication & Session Management

ResearchForge uses **Better Auth** for session handling. The frontend can use Better Auth's official client library (`better-auth/react`) or standard fetch requests with cookie credentials.

### 1.1. Session Credentials & Cookies
- The backend sets an `httpOnly`, `SameSite=Lax` cookie named `better-auth.session_token`.
- Every client HTTP request must include credentials:
  ```javascript
  // Native fetch example:
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/workspaces`, {
    credentials: "include", // Required to send cookies
    headers: {
      "Content-Type": "application/json",
      "x-workspace-id": currentWorkspaceId, // Required for workspace-scoped calls
    },
  });
  ```
- Alternatively, include the Bearer token in the Authorization header:
  ```http
  Authorization: Bearer <session_token>
  ```

### 1.2. Key Authentication Endpoints
- **Register**: `POST /api/auth/sign-up/email` (`{ name, email, password }`)
- **Login**: `POST /api/auth/sign-in/email` (`{ email, password }`)
- **Get Session**: `GET /api/auth/get-session` -> Returns `{ user, session }` or `null`.
- **Logout**: `POST /api/auth/sign-out`
- **Social OAuth**: Navigate window to `GET /api/auth/oauth/github` or `/api/auth/oauth/google`.

---

## 2. API Contract & Response Format

### 2.1. Standard Response Envelope
All non-streaming responses conform to:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: Array<{ field: string; message: string }> | null;
  } | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## 3. Research Run Lifecycle & State Flow

```
   [Create Run] (POST /api/research/runs)
         │
         ▼
     [PLANNING]
         │
         ├─── requirePlanApproval = false ────────┐
         │                                        │
         ▼ (requirePlanApproval = true)           │
[WAITING_FOR_APPROVAL]                            │
         │                                        │
         ▼ (POST /api/research/runs/:id/approve)  │
     [RUNNING] ◄──────────────────────────────────┘
         │
         ▼
    [VERIFYING]
         │
         ▼
   [SYNTHESIZING]
         │
         ▼
    [COMPLETED] (Report is ready to view and export)
```

### 3.1. Research Run Status Values
- `QUEUED`: Enqueued in execution queue.
- `PLANNING`: Planner Agent formulating task DAG.
- `WAITING_FOR_APPROVAL`: Planner finished; awaiting human user approval.
- `RUNNING`: Discovery & Extraction agents gathering evidence.
- `VERIFYING`: Verification Agent fact-checking claims and cross-referencing contradictions.
- `SYNTHESIZING`: Synthesis Agent performing gap analysis and synthesizing report.
- `PAUSED`: Execution paused by user (`POST /api/research/runs/:id/pause`).
- `COMPLETED`: Research complete; report generated.
- `FAILED`: Execution stopped due to error (inspect `failureReason`).
- `CANCELLED`: Explicitly cancelled by user.

---

## 4. Real-Time Server-Sent Events (SSE) Protocol

The frontend connects to the live event stream using the browser's native `EventSource` or `fetch-event-source`:

```javascript
const eventSource = new EventSource(
  `${process.env.NEXT_PUBLIC_API_URL}/research/runs/${runId}/events`,
  { withCredentials: true }
);

eventSource.addEventListener("research_event", (e) => {
  const event = JSON.parse(e.data);
  console.log(`[Seq #${event.sequence}] ${event.type}:`, event.message);
  // Update React state: timeline, agent thoughts, discovered sources
});

eventSource.onerror = (err) => {
  console.error("SSE stream error:", err);
  // Reconnect logic: EventSource will auto-reconnect
};
```

### 4.1. Event Schema (`ResearchEvent`)
```typescript
interface ResearchEvent {
  id: string;
  runId: string;
  sequence: number; // Strictly monotonic integer: 1, 2, 3...
  type: 
    | "agent_thought"      // Internal reasoning string
    | "tool_call"           // Tool execution start or completion
    | "source_discovered"   // New web/academic source found
    | "finding_extracted"   // Extracted fact from source
    | "claim_verified"      // Fact verification result
    | "progress_update"     // Percent completion (0-100) & status message
    | "run_status_changed"  // Transition to RUNNING, COMPLETED, etc.
    | "error";              // Non-fatal error or warning
  agent: "PLANNER" | "DISCOVERY" | "EXTRACTION" | "VERIFICATION" | "SYNTHESIS" | "REPORTING" | "SYSTEM";
  severity: "DEBUG" | "INFO" | "WARNING" | "ERROR";
  title: string;
  message: string;
  payload: Record<string, any>;
  timestamp: string; // ISO 8601 string
}
```

---

## 5. Human-in-the-Loop Plan Approval

When `run.status === "WAITING_FOR_APPROVAL"`, the UI should present the plan review card.

### 5.1. Fetch Plan Details
```http
GET /api/plans/runs/:runId
```
Returns:
```json
{
  "success": true,
  "data": {
    "id": "cmw1plan0001",
    "status": "DRAFT",
    "tasks": [
      {
        "id": "task_1",
        "agent": "DISCOVERY",
        "title": "Search arXiv and IEEE for 2026 neutral atom benchmarks",
        "tools": ["tavily_search", "exa_search"]
      }
    ]
  }
}
```

### 5.2. Submit Approval or Feedback
```http
POST /api/research/runs/:runId/approve-plan
Content-Type: application/json

{
  "planId": "cmw1plan0001",
  "approved": true,
  "modifications": "Focus on two-qubit gate fidelities above 99.5%."
}
```

---

## 6. Reports & Document Exports

### 6.1. Retrieve Report
```http
GET /api/reports/runs/:runId
```
Returns structured research report sections, abstract, key findings, and references.

### 6.2. Trigger Export
```http
POST /api/reports/runs/:runId/export
Content-Type: application/json

{
  "format": "PDF" // "PDF" | "DOCX" | "MARKDOWN" | "HTML"
}
```
Returns `{ exportId, status: "COMPLETED", downloadUrl: "/api/reports/exports/:exportId" }`.

### 6.3. Citation Footnote Format
The report markdown includes numeric citation footnotes `[^1]`, `[^2]` corresponding to the `citations` array:
```typescript
interface ReportCitation {
  id: string;
  citationNumber: number; // 1, 2, 3...
  sourceUrl: string;
  title: string;
  snippet: string;
  authors: string[];
  publicationDate?: string;
  reliabilityScore: number; // 0.0 - 1.0
}
```

---

## 7. Knowledge Graph Visualization

The frontend uses React Flow or Cytoscape to visualize the research knowledge graph:

```http
GET /api/knowledge-graph/workspace/:workspaceId
```
Returns:
```typescript
interface KnowledgeGraphData {
  nodes: Array<{
    id: string;
    label: string;
    nodeType: "TOPIC" | "CONCEPT" | "CLAIM" | "ENTITY" | "TECHNOLOGY" | "PERSON" | "ORGANIZATION";
    properties: Record<string, any>;
  }>;
  edges: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    relationType: "RELATED_TO" | "SUPPORTS" | "CONTRADICTS" | "DEPENDS_ON" | "PART_OF" | "COMPARES_WITH" | "REFERENCES";
    weight: number; // 0.0 - 1.0
  }>;
}
```

---

## 8. Analytics Dashboard

```http
GET /api/analytics/workspace/:workspaceId
```
Returns aggregated metrics for rendering Recharts dashboards:
- `totalRuns`, `completedRuns`, `failedRuns`
- `totalSourcesDiscovered`, `totalClaimsVerified`
- `totalLLMTokens`, `totalMCPToolCalls`
- `averageRunDurationMs`

