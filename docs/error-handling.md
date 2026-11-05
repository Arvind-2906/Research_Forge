# ResearchForge Error Handling & Reliability Strategy

**Standard Error Schema:** Uniform JSON Envelope  
**Defense in Depth:** Recursive Secret Scrubbing & Automatic Graceful Fallbacks  

---

## 1. Standard Error Response Envelope

All API endpoints across the Node.js API Gateway and Python AI Engine return a uniform JSON error payload:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "WORKSPACE_NOT_FOUND",
    "message": "The requested workspace does not exist or has been deleted.",
    "statusCode": 404,
    "details": null
  }
}
```

For validation failures (e.g. Zod or Pydantic errors), `details` contains field-specific violations:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters provided.",
    "statusCode": 400,
    "details": [
      {
        "field": "query",
        "message": "Research query must be at least 10 characters long"
      }
    ]
  }
}
```

---

## 2. Standard Error Code Taxonomy

| HTTP Status | Error Code | Description | Typical Remediation |
|---|---|---|---|
| `400` | `VALIDATION_ERROR` | Request body or query parameters failed schema validation | Fix payload to match Zod/Pydantic schema |
| `400` | `SSRF_DETECTED` | Target scraping or webhook URL points to private/loopback/cloud metadata IP | Supply a valid public URL |
| `401` | `UNAUTHORIZED` | Missing or invalid user session cookie / Bearer token | Re-authenticate via `/api/auth/sign-in` |
| `401` | `SESSION_EXPIRED` | The user session token has expired | Re-authenticate to obtain fresh session |
| `403` | `FORBIDDEN` | Missing required workspace role (e.g. `MEMBER` attempting `OWNER` action) | Request administrative permission |
| `403` | `WORKSPACE_FORBIDDEN` | User is not a member of the requested workspace | Switch to an authorized workspace |
| `403` | `INTERNAL_KEY_INVALID`| Missing or invalid `X-Internal-Service-Key` | Verify `INTERNAL_SERVICE_SECRET` alignment |
| `404` | `WORKSPACE_NOT_FOUND` | Workspace ID does not exist | Verify workspace ID |
| `404` | `PROJECT_NOT_FOUND` | Research project ID does not exist | Verify project ID |
| `404` | `RUN_NOT_FOUND` | Research run ID does not exist | Verify run ID |
| `429` | `RATE_LIMIT_EXCEEDED` | Request threshold exceeded for current sliding-window window | Inspect `Retry-After` header and back off |
| `500` | `INTERNAL_SERVER_ERROR`| Unhandled server-side exception | Check sanitized server logs for trace |
| `503` | `SERVICE_UNAVAILABLE` | External dependency unavailable | Retry after brief interval |

---

## 3. Node.js Error Handling Architecture

The centralized Express error handler ([`backend/node-server/src/middleware/errorHandler.js`](file:///C:/Arvind/Reasearch_Forge/backend/node-server/src/middleware/errorHandler.js)) intercepts all thrown errors and applies:

1. **Custom `AppError` Normalization**: Maps domain errors to HTTP status codes and standard codes.
2. **Prisma Error Translation**:
   - `P2002` (Unique constraint violation) -> 409 Conflict (`RESOURCE_CONFLICT`).
   - `P2025` (Record to update/delete not found) -> 404 Not Found (`RECORD_NOT_FOUND`).
3. **Zod Validation Translation**: Formats Zod issues into clean field-level error messages.
4. **Recursive Secret Scrubbing**: Traverses error messages, stack traces, and details to redact:
   - Passwords and private keys
   - Database connection strings (`postgres://user:[REDACTED]@host...`)
   - Bearer tokens and API keys

---

## 4. Graceful Degradation & Fallbacks

### 4.1. Resilient SSE Stream Fallback
If a user is streaming research events from `GET /api/research/runs/:runId/events` and the Python AI Engine restarts or experiences network blips:
1. The Node.js gateway detects the internal connection failure (`fetch failed`).
2. Instead of terminating the SSE stream with an error, it logs a warning:
   `[SSE Proxy] AI Engine SSE stream unreachable. Using database fallback stream.`
3. Node seamlessly begins polling the `ResearchEvent` table in Neon PostgreSQL (`sequence > lastSequence`), ensuring the frontend continues receiving real-time events without disconnect.

### 4.2. MCP Tool Failure Isolation
When a tool fails during research execution (e.g. Firecrawl scraper rate limit or network timeout):
1. The `MCPClientManager` catches the exception and logs an `MCPToolCall` record with `status: "FAILED"` and diagnostic error messages.
2. The agent graph does not crash. The Extraction Agent notes the source extraction failure, marks the source status as `FAILED`, and continues extracting findings from other discovered sources.

### 4.3. LLM Rate Limit & Retry Backoff
The LLM Service (`llm_service.py`) wraps model calls in an exponential backoff loop with jitter:
- **Maximum Retries**: 3 attempts.
- **Initial Delay**: 1.0 second.
- **Backoff Multiplier**: $2 \times \text{delay} + \text{random}(0, 0.5)$.

