# ResearchForge Multi-Agent Workflow & LangGraph Architecture

**Framework:** LangGraph (Python)  
**Checkpointing:** PostgreSQL Persistence  
**State Machine Engine:** StateGraph with Conditional Edges  

---

## 1. Multi-Agent State Machine Topology

The ResearchForge AI Engine orchestrates specialized autonomous agents through a cyclic directed graph compiled with **LangGraph**. The workflow balances autonomous exploration with human-in-the-loop governance and iterative gap resolution.

```
                           ┌───────────────────────────┐
                           │      Research Request     │
                           └─────────────┬─────────────┘
                                         │
                                         ▼
                           ┌───────────────────────────┐
                           │       Planner Agent       │
                           │ - Decompose research query│
                           │ - Generate ResearchPlan   │
                           └─────────────┬─────────────┘
                                         │
                                         ▼
                           ┌───────────────────────────┐
                           │  Plan Approval Checkpoint │
                           └─────────────┬─────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
         requirePlanApproval = false                 requirePlanApproval = true
                   │                                           │
                   │                                           ▼
                   │                               ┌───────────────────────────┐
                   │                               │    WAITING_FOR_APPROVAL   │
                   │                               │  (Graph Paused in Neon)   │
                   │                               └───────────┬───────────────┘
                   │                                           │
                   │                                           │ User Calls /approve-plan
                   │                                           ▼
                   └─────────────────► ◄───────────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │          Discovery Agent          │◄──────────────────────┐
                     │ - Query Tavily & Exa Search MCPs  │                       │
                     │ - Filter domains & rank sources   │                       │
                     └─────────────────┬─────────────────┘                       │
                                       │                                         │
                                       ▼                                         │
                     ┌───────────────────────────────────┐                       │
                     │         Extraction Agent          │                       │
                     │ - Scrape URLs via Firecrawl MCP   │                       │
                     │ - Extract factual findings        │                       │
                     └─────────────────┬─────────────────┘                       │
                                       │                                         │
                                       ▼                                         │
                     ┌───────────────────────────────────┐                       │
                     │        Verification Agent         │                       │
                     │ - Fact-check claims vs evidence   │                       │
                     │ - Detect cross-source conflict    │                       │
                     └─────────────────┬─────────────────┘                       │
                                       │                                         │
                                       ▼                                         │
                     ┌───────────────────────────────────┐                       │
                     │          Synthesis Agent          │                       │
                     │ - Evaluate objective coverage     │                       │
                     │ - Perform Research Gap Analysis   │                       │
                     └─────────────────┬─────────────────┘                       │
                                       │                                         │
                        Evidentiary Gaps Detected &                              │
                        Iterations < Max (Default: 3)                            │
                                       │                                         │
                                       ├─────────────────────────────────────────┘
                                       │
                                       │ Evidence Complete /
                                       │ Max Iterations Reached
                                       ▼
                     ┌───────────────────────────────────┐
                     │          Reporting Agent          │
                     │ - Academic report generation      │
                     │ - Inline IEEE/APA citations       │
                     │ - Multi-format export (PDF/DOCX)  │
                     └─────────────────┬─────────────────┘
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │          Run Completed            │
                     └───────────────────────────────────┘
```

---

## 2. State Schema (`ResearchGraphState`)

The shared LangGraph state persists across all transitions:

```python
class ResearchGraphState(TypedDict):
    run_id: str
    project_id: str
    workspace_id: str
    query: str
    depth: int
    breadth: int
    require_plan_approval: bool

    # Planning & Task Tracking
    plan: Optional[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    active_task_index: int

    # Gathered Evidence & Sources
    sources: List[Dict[str, Any]]
    extracted_findings: List[Dict[str, Any]]
    claims: List[Dict[str, Any]]
    evidence: List[Dict[str, Any]]
    contradictions: List[Dict[str, Any]]

    # Iteration & Gap Tracking
    iteration_count: int
    max_iterations: int
    research_gaps: List[str]

    # Synthesis & Deliverables
    synthesis_summary: Optional[str]
    final_report: Optional[Dict[str, Any]]
    status: str
    errors: List[str]
```

---

## 3. Agent Specifications & Roles

### 3.1. Planner Agent
- **Purpose**: Deconstructs ambiguous or complex research inquiries into logical, verifiable sub-objectives.
- **Inputs**: User `query`, `breadth`, `depth`, scoped memory context.
- **Outputs**:
  - `ResearchPlan` record with title, hypothesis, methodology, and scope boundaries.
  - DAG of `ResearchTask` records assigning specific tasks to agent types with tool specifications.
- **Model**: Groq `openai/gpt-oss-120b` (or Gemini 1.5 Pro).

### 3.2. Discovery Agent
- **Purpose**: Navigates the open web, academic literature, and code repositories to find authoritative sources.
- **Tools**:
  - `tavily_search`: Real-time web and news discovery.
  - `exa_search`: Semantic search filtering by category (`research paper`, `news`, `company`).
  - `github_search`: Code repositories and issues.
- **Outputs**: Discovered sources registered in `ResearchSource` table with domain provenance and initial relevance ranking.

### 3.3. Extraction Agent
- **Purpose**: Retrieves full-text content from discovered sources and isolates discrete empirical facts.
- **Tools**:
  - `firecrawl_scrape`: Clean markdown extraction from web pages.
  - Local PDF/Docx parser: Text extraction for academic preprints.
- **Outputs**:
  - Raw snapshots archived in `SourceSnapshot`.
  - Granular findings linked to source URLs, exact paragraph numbers, and author attributions.

### 3.4. Verification & Contradiction Agent
- **Purpose**: Rigorously analyzes extracted claims to prevent hallucination and detect scientific or factual disagreements.
- **Classification Categories**:
  - `VERIFIED`: Substantiated by multiple independent, authoritative sources with consistent quantitative data.
  - `PARTIALLY_VERIFIED`: Corroborated in general principle, but differing in secondary parameters or methodology.
  - `CONTRADICTED`: Conflicting claims identified across sources (e.g. Source A reports 99.8% fidelity, Source B reports < 97.0%).
  - `UNVERIFIED`: Single-source claim lacking external corroboration.
- **Outputs**: `ResearchClaim`, `Evidence`, and `ClaimEvidence` junction records with calculated confidence coefficients ($0.0 - 1.0$).

### 3.5. Synthesis & Gap Analysis Agent
- **Purpose**: Triangulates cross-source evidence, evaluates whether all tasks in the research plan are satisfied, and determines whether an additional research loop is required.
- **Loop Decision Condition**:
  ```python
  def should_continue_research(state: ResearchGraphState) -> str:
      if state["iteration_count"] >= state["max_iterations"]:
          return "generate_report"
      if len(state["research_gaps"]) > 0:
          return "discovery_loop"
      return "generate_report"
  ```
- **Outputs**: Consolidated thematic findings, gap lists, or trigger signal for re-entry to the Discovery Agent.

### 3.6. Reporting Agent
- **Purpose**: Synthesizes verified findings into an academic-grade, publication-ready research paper.
- **Structure**:
  1. Executive Summary & Abstract
  2. Research Background & Methodology
  3. Key Findings & Cross-Source Synthesis
  4. Contradiction & Uncertainty Analysis
  5. Empirical Evidence Matrix
  6. Verified References & Complete Citation Footnotes
- **Exports**: Markdown, Microsoft Word (`.docx`), PDF, and standalone styled HTML.

---

## 4. Human-in-the-Loop Approval Checkpoint

When a user initiates research with `requirePlanApproval: true`:
1. The Planner Agent generates the draft plan and persists it in PostgreSQL.
2. The LangGraph engine interrupts execution at the `human_approval_checkpoint` node.
3. The run status transitions to `WAITING_FOR_APPROVAL` and emits an SSE event.
4. The user inspects the plan in the frontend UI and submits approval via:
   `POST /api/research/runs/:runId/approve-plan`
5. The API server updates the plan record and signals the AI Engine, which deserializes the persisted checkpoint from PostgreSQL and seamlessly resumes agent execution.

---

## 5. Failure Recovery & Persistent Checkpoints

- **PostgreSQL Checkpoint Storage**: Every node transition writes state checkpoints to PostgreSQL.
- **Automatic Resume**: If the AI Engine server restarts or experiences network failure, any active run in `RUNNING`, `VERIFYING`, or `SYNTHESIZING` can be resumed without re-executing previously completed tasks.
- **Cancellation & Pause**: Explicit pause requests (`/pause`) yield the thread safely at the next agent boundary, preserving intermediate findings.

