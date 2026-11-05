# ResearchForge API Examples & Workflow Guide

This document contains copy-pasteable `curl` commands and JSON payloads illustrating end-to-end user and agent workflows.

---

## 1. Authentication Workflow

### 1.1. User Registration
```bash
curl -X POST http://localhost:5000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. Sarah Connor",
    "email": "sarah.connor@research.org",
    "password": "SecurePassword123!"
  }'
```
**Response (200 OK):**
```json
{
  "user": {
    "id": "cmw1usera0001",
    "email": "sarah.connor@research.org",
    "name": "Dr. Sarah Connor",
    "createdAt": "2026-11-04T10:00:00.000Z"
  },
  "session": {
    "token": "sess_tok_9918274192",
    "expiresAt": "2026-11-11T10:00:00.000Z"
  }
}
```

### 1.2. Email Sign-In
```bash
curl -X POST http://localhost:5000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sarah.connor@research.org",
    "password": "SecurePassword123!"
  }' \
  -c cookies.txt
```

### 1.3. Get Current User & Session
```bash
curl -X GET http://localhost:5000/api/auth/get-session \
  -b cookies.txt
```

---

## 2. Workspace Management

### 2.1. Create Workspace
```bash
curl -X POST http://localhost:5000/api/workspaces \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Autonomous Systems Lab",
    "slug": "autonomous-systems-lab",
    "description": "Robotics and reinforcement learning research workspace"
  }'
```
**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "cmw1worksp0001",
    "name": "Autonomous Systems Lab",
    "slug": "autonomous-systems-lab",
    "role": "OWNER",
    "createdAt": "2026-11-04T10:05:00.000Z"
  }
}
```

### 2.2. Invite Workspace Member
```bash
curl -X POST http://localhost:5000/api/workspaces/cmw1worksp0001/members \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "email": "colleague@research.org",
    "role": "MEMBER"
  }'
```

---

## 3. Research Projects

### 3.1. Create Project
```bash
curl -X POST http://localhost:5000/api/projects \
  -b cookies.txt \
  -H "x-workspace-id: cmw1worksp0001" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Quantum Error Correction in Neutral Atoms",
    "description": "Surveying topological surface codes implemented on neutral atom arrays",
    "tags": ["quantum-computing", "neutral-atoms", "fault-tolerance"]
  }'
```
**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "cmw1proj0001",
    "workspaceId": "cmw1worksp0001",
    "title": "Quantum Error Correction in Neutral Atoms",
    "status": "ACTIVE",
    "createdAt": "2026-11-04T10:10:00.000Z"
  }
}
```

---

## 4. Autonomous Research Run Lifecycle

### 4.1. Step 1: Initiate Research Run
```bash
curl -X POST http://localhost:5000/api/research/runs \
  -b cookies.txt \
  -H "x-workspace-id: cmw1worksp0001" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "cmw1proj0001",
    "query": "What are the latest 2026 benchmarks for two-qubit gate fidelities in neutral atom quantum processors?",
    "breadth": 4,
    "depth": 3,
    "requirePlanApproval": true
  }'
```
**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "runId": "cmw1run0001",
    "projectId": "cmw1proj0001",
    "status": "PLANNING",
    "query": "What are the latest 2026 benchmarks for two-qubit gate fidelities in neutral atom quantum processors?",
    "requirePlanApproval": true
  }
}
```

### 4.2. Step 2: Generate Research Plan
```bash
curl -X POST http://localhost:5000/api/research/runs/cmw1run0001/plan \
  -b cookies.txt \
  -H "x-workspace-id: cmw1worksp0001"
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "planId": "cmw1plan0001",
    "status": "DRAFT",
    "tasks": [
      {
        "id": "task_1",
        "agent": "DISCOVERY",
        "title": "Search arXiv and IEEE for 2025-2026 neutral atom benchmarks",
        "tools": ["tavily_search", "exa_search"]
      },
      {
        "id": "task_2",
        "agent": "EXTRACTION",
        "title": "Extract CZ and Rydberg gate fidelities and coherence times",
        "tools": ["firecrawl_scrape"]
      },
      {
        "id": "task_3",
        "agent": "VERIFICATION",
        "title": "Cross-verify fidelity claims against randomized benchmarking data",
        "tools": []
      }
    ]
  }
}
```

### 4.3. Step 3: Human Review & Approval
```bash
curl -X POST http://localhost:5000/api/research/runs/cmw1run0001/approve-plan \
  -b cookies.txt \
  -H "x-workspace-id: cmw1worksp0001" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "cmw1plan0001",
    "approved": true,
    "modifications": "Focus specifically on Rydberg blockade implementations above 99.5% fidelity."
  }'
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "runId": "cmw1run0001",
    "status": "RUNNING",
    "message": "Plan approved. Research execution initiated."
  }
}
```

### 4.4. Step 4: Stream Real-Time Events via SSE
```bash
curl -N -X GET http://localhost:5000/api/research/runs/cmw1run0001/events \
  -b cookies.txt \
  -H "x-workspace-id: cmw1worksp0001"
```
**Server-Sent Events Stream Output:**
```
event: research_event
data: {"id":"cmw1evt0001","runId":"cmw1run0001","sequence":1,"type":"agent_thought","agent":"DISCOVERY","title":"Formulating queries","message":"Searching Tavily and Exa for recent Rydberg gate randomized benchmarking papers.","timestamp":"2026-11-04T10:15:02.120Z"}

event: research_event
data: {"id":"cmw1evt0002","runId":"cmw1run0001","sequence":2,"type":"tool_call","agent":"DISCOVERY","title":"Tavily Search","message":"Executed tavily_search with query 'neutral atom Rydberg gate fidelity 2026'","payload":{"query":"neutral atom Rydberg gate fidelity 2026","resultsCount":6},"timestamp":"2026-11-04T10:15:04.450Z"}

event: research_event
data: {"id":"cmw1evt0003","runId":"cmw1run0001","sequence":3,"type":"source_discovered","agent":"DISCOVERY","title":"New Source Discovered","message":"Discovered Nature Physics paper on 99.8% two-qubit CZ gate fidelity in Yb-171 arrays.","payload":{"url":"https://nature.com/articles/s41567-026-0001","title":"High-fidelity entanglement of neutral Yb atoms"},"timestamp":"2026-11-04T10:15:06.890Z"}

event: research_event
data: {"id":"cmw1evt0004","runId":"cmw1run0001","sequence":4,"type":"claim_verified","agent":"VERIFICATION","title":"Claim Verified","message":"Claim: 'Two-qubit gate fidelity exceeded 99.7%' verified with 0.96 confidence.","payload":{"claimId":"claim_1","status":"VERIFIED","confidence":0.96},"timestamp":"2026-11-04T10:15:10.110Z"}

event: research_event
data: {"id":"cmw1evt0005","runId":"cmw1run0001","sequence":5,"type":"run_status_changed","agent":"SYSTEM","title":"Status Completed","message":"Research synthesis complete. Final report compiled.","payload":{"status":"COMPLETED"},"timestamp":"2026-11-04T10:15:18.400Z"}
```

---

## 5. Reports & Document Exports

### 5.1. Retrieve Synthesized Report
```bash
curl -X GET http://localhost:5000/api/reports/runs/cmw1run0001 \
  -b cookies.txt \
  -H "x-workspace-id: cmw1worksp0001"
```

### 5.2. Export Report as PDF, DOCX, Markdown, or HTML
```bash
curl -X POST http://localhost:5000/api/reports/runs/cmw1run0001/export \
  -b cookies.txt \
  -H "x-workspace-id: cmw1worksp0001" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "PDF"
  }'
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "exportId": "cmw1exp0001",
    "format": "PDF",
    "status": "COMPLETED",
    "downloadUrl": "/api/reports/exports/cmw1exp0001"
  }
}
```

### 5.3. Validate Citations
```bash
curl -X POST http://localhost:5000/api/reports/runs/cmw1run0001/validate-citations \
  -b cookies.txt \
  -H "x-workspace-id: cmw1worksp0001"
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalCitations": 14,
    "validCitations": 14,
    "invalidCitations": 0,
    "citationAccuracy": 1.0,
    "unverifiedReferences": []
  }
}
```

---

## 6. Knowledge Graph

### 6.1. Create Knowledge Node
```bash
curl -X POST http://localhost:5000/api/knowledge-graph/nodes \
  -b cookies.txt \
  -H "x-workspace-id: cmw1worksp0001" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "cmw1worksp0001",
    "label": "Yb-171 Neutral Atom Processor",
    "nodeType": "TECHNOLOGY",
    "properties": {
      "fidelities": { "twoQubit": 0.998, "singleQubit": 0.9997 },
      "arrayDimensions": "100x100 optical tweezers"
    }
  }'
```

### 6.2. Semantic Similarity Graph Search
```bash
curl -X POST http://localhost:5000/api/knowledge-graph/search \
  -b cookies.txt \
  -H "x-workspace-id: cmw1worksp0001" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "cmw1worksp0001",
    "query": "high fidelity optical tweezer qubits",
    "limit": 5,
    "minSimilarity": 0.65
  }'
```

---

## 7. Analytics

### 7.1. Retrieve Workspace Analytics
```bash
curl -X GET http://localhost:5000/api/analytics/workspace/cmw1worksp0001 \
  -b cookies.txt \
  -H "x-workspace-id: cmw1worksp0001"
```
**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalRuns": 18,
    "completedRuns": 16,
    "failedRuns": 2,
    "totalSourcesDiscovered": 142,
    "totalClaimsVerified": 89,
    "totalLLMTokens": 248920,
    "totalMCPToolCalls": 114,
    "averageRunDurationMs": 28400
  }
}
```

