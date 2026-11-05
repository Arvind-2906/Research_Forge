# ResearchForge Automated Testing & Verification Guide

ResearchForge maintains comprehensive, regression-tested suites across both services with **100% test pass rates**.

---

## 1. Test Suite Summary

| Service | Test Runner | Files Tested | Total Tests | Execution Time | Pass Rate |
|---|---|---|---|---|---|
| **Python AI Engine** | `pytest` + `pytest-asyncio` | 9 test modules | **68 tests** | ~88s | **100%** |
| **Node.js API Server** | Node.js Test Runner (`node --test`) | 8 test suites | **17 test suites** | ~126s | **100%** |

---

## 2. Python AI Engine Testing (`pytest`)

### 2.1. Running the Full Test Suite
Navigate to `backend/ai-engine` with your virtual environment activated:

```bash
cd backend/ai-engine

# Activate virtual environment
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux/macOS

# Run all 68 tests with summary
pytest -v

# Run with quiet progress dots
pytest -q
```

### 2.2. Running Specific Test Suites
```bash
# Security & SSRF / Prompt Injection / Tool Clamping Tests (Phase 10)
pytest tests/test_phase10_security_reliability.py -v

# Multi-Agent Orchestration & LangGraph Tests (Phase 6)
pytest tests/test_phase6_agents.py -v

# pgvector Scoped Memory & RAG Tests (Phase 7)
pytest tests/test_phase7_memory.py -v

# Reports, Knowledge Graph & Deduplication Tests (Phase 9)
pytest tests/test_phase9.py -v

# Monotonic Sequence & Transaction Lock Tests
pytest tests/test_event_repository.py -v
```

### 2.3. Key Fixtures & Asyncio Configuration
- `conftest.py` automatically initializes and cleans up async database connection pools (`cleanup_db_connections`).
- Unit tests use realistic mocks (`unittest.mock.AsyncMock`) for external network calls (Groq, Tavily, Firecrawl) while validating schema contracts against real Pydantic models.

---

## 3. Node.js API Server Testing (`node --test`)

### 3.1. Running the Full Test Suite
Navigate to `backend/node-server`:

```bash
cd backend/node-server

# Run all 17 test suites sequentially
npm test
```
*Note: Tests run with `--test-concurrency=1` to ensure database transactional fixtures do not collide across concurrent tests against the shared Neon instance.*

### 3.2. Running Individual Test Files
```bash
# Security, BOLA, SSRF, and Secret Scrubbing Suite (Phase 10)
node --test tests/phase10_security_reliability.test.js

# Real-Time SSE Events & Fallback Stream Suite (Phase 8)
node --test tests/events.test.js

# Better Auth & RBAC Authorization Suite (Phase 2)
node --test tests/auth.test.js
node --test tests/workspaceAuth.test.js

# Workspace & Research Run Lifecycle Suite (Phase 3)
node --test tests/phase3.test.js

# Reports & Knowledge Graph Integration Suite (Phase 9)
node --test tests/phase9.test.js
```

### 3.3. Test Rate Limiter Handling
To prevent rapid integration tests from tripping sliding-window 429 limits, the rate limiter middleware checks:
```javascript
if (process.env.NODE_ENV === "test" && !req.headers["x-test-rate-limit"]) {
  return next();
}
```
Rate limiting behavior itself is explicitly verified by providing the `x-test-rate-limit: true` header in `phase10_security_reliability.test.js`.

---

## 4. Security Verification Coverage

The automated tests explicitly verify defenses against the OWASP Top 10 for LLMs and APIs:

1. **SSRF Defense (`test_is_safe_url`)**:
   - Loopback IPs (`127.0.0.1`, `::1`) -> Blocked.
   - Private subnets (`10.0.0.1`, `192.168.1.1`) -> Blocked.
   - Cloud metadata (`169.254.169.254`, `metadata.google.internal`) -> Blocked.
   - Public domains (`https://nature.com`, `https://arxiv.org`) -> Allowed.
2. **Prompt Injection & Delimiters (`test_sanitize_prompt_input`)**:
   - Escapes LLM boundary tokens (`<system>`, `[INST]`, `<<SYS>>`, `<|im_start|>`).
   - Neutralizes prompt override directives (`ignore all previous instructions`).
3. **Tool Output Exhaustion (`test_truncate_tool_output`)**:
   - Clamps strings, dicts, and lists exceeding 50,000 characters with diagnostic notices.
4. **Secret Scrubbing (`test_sanitize_secrets`)**:
   - Scrubbed database connection strings (`postgres://user:pass@host...`).
   - Redacted Bearer tokens, passwords, and sensitive keys from logs and error stacks.
5. **BOLA & Multi-Tenant Isolation (`test_cross_workspace_isolation`)**:
   - Users cannot view, modify, or query projects, runs, or documents belonging to another workspace.
6. **Monotonic Event Sequencing (`test_monotonic_concurrency`)**:
   - Emitting 20 events concurrently across workers yields strictly contiguous, monotonic sequences (1, 2, 3... 20) with zero duplicate keys.

