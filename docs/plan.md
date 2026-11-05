# MASTER DEVELOPMENT PROMPT — ResearchForge Backend

Act as a senior backend architect, Python AI engineer, and agentic AI systems developer.

I want you to build the complete backend for **ResearchForge — Autonomous Research Workspace**, a full-stack agentic AI research platform.

The frontend will be developed separately. Your responsibility is to implement the entire backend, including:

1. Node.js application backend (`node-server`)
2. Python AI backend (`ai-engine`)
3. Multi-agent orchestration using LangGraph
4. Remote MCP integration and tool execution system
5. Database integration using Neon PostgreSQL, Prisma, and pgvector
6. Authentication, authorization, business logic, APIs, real-time execution updates, and persistence.

Do not build any frontend, UI components, or frontend styling.

---

# 1. FIRST: INSPECT THE EXISTING PROJECT

Before writing code, inspect the existing project directory and understand the files already provided.

I have already provided:

- `schema.prisma` containing the database models and relationships.
- `.env` containing the required API keys and database credentials.
- Google OAuth credentials.
- GitHub OAuth credentials.
- Tavily API key.
- Exa API key.
- Firecrawl API key.
- Neon PostgreSQL database URL.
- Hugging Face access token.
- Groq API key.
- Redis credentials, if present.
- Other optional integration credentials, if present.

Important instructions:

1. Do not ask me to provide credentials that already exist in the environment files.
2. Never print, expose, commit, or log API keys, OAuth secrets, passwords, or tokens.
3. Do not overwrite the existing `.env` file.
4. Create `.env.example` containing variable names and descriptions but no actual secrets.
5. Inspect the existing Prisma schema completely before making changes.
6. Preserve existing models and relationships unless a genuine architectural problem requires a change.
7. If schema modifications are necessary, explain why and update the schema and migrations consistently.
8. Check the installed versions of Prisma, Better Auth, LangGraph, LangChain, MCP SDK, and other dependencies before implementation.
9. Do not assume that an API, model, or MCP tool exists. Verify it using the actual provider documentation or tool discovery.
10. Do not create duplicate project structures if the required folders already exist.

After inspection, provide a brief implementation plan and then begin Phase 1.

---

# 2. PROJECT ARCHITECTURE

Use the following architecture.

## A. Node.js Application Backend

Location:

`backend/node-server/`

Technology stack:

- Node.js
- Express.js
- JavaScript (ES Modules)
- Prisma ORM
- Neon PostgreSQL
- Better Auth
- Google OAuth
- GitHub OAuth
- Zod validation
- Redis
- Native Fetch API
- JWT or secure internal service authentication where required.

Responsibilities:

- User authentication and sessions.
- User and workspace management.
- Workspace-level authorization.
- Project management.
- Research run management.
- Research plans and task management APIs.
- Research history.
- Reports and citations.
- Document upload management.
- MCP integration settings and permissions.
- User preferences and application settings.
- LLM usage tracking.
- AI engine communication.
- Internal API authentication.
- Input validation and error handling.

## B. Python AI Backend

Location:

`backend/ai-engine/`

Technology stack:

- Python 3.12+
- FastAPI
- LangGraph
- LangChain
- Groq API
- Hugging Face Inference API
- PostgreSQL
- psycopg
- pgvector
- SSE
- LangGraph PostgreSQL checkpointing.

Responsibilities:

- Research execution.
- Research planning.
- Agent orchestration.
- Source discovery.
- Source extraction.
- Evidence collection.
- Claim verification.
- Contradiction detection.
- Research synthesis.
- Report generation.
- RAG.
- Embeddings.
- Persistent agent memory.
- MCP connection management.
- MCP tool discovery and invocation.
- Execution events and progress streaming.

## C. MCP Integration Layer

Location:

`backend/ai-engine/mcp/`

This is an MCP client and orchestration subsystem.

IMPORTANT:

Do not build custom MCP servers.

Integrate existing remote MCP servers using the official Python MCP SDK and `langchain-mcp-adapters`.

Initial integrations:

1. Tavily MCP — general web search.
2. Exa MCP — semantic search and research discovery.
3. Firecrawl MCP — webpage scraping, crawling, and content extraction.
4. GitHub MCP — repository and code research.

Use supported remote transports, preferably Streamable HTTP where available.

Do not hardcode assumed MCP tool names. Dynamically discover tools using MCP `tools/list` and use the actual tool schemas returned by each server.

Keep MCP integration modular so additional providers can be added later.

---

# 3. AI MODEL CONFIGURATION

Use Groq as the primary LLM provider.

Primary model:

`openai/gpt-oss-120b`

Use it for:

- Research planning.
- Complex reasoning.
- Agent decisions.
- Evidence evaluation.
- Claim verification.
- Contradiction resolution.
- Final synthesis.
- Report generation.

Lightweight model:

`openai/gpt-oss-20b`

Use it for:

- Content classification.
- Information extraction.
- Source summarization.
- Query classification.
- Metadata extraction.
- Simple intermediate tasks.

Embedding model:

`BAAI/bge-small-en-v1.5`

Requirements:

- Embedding dimension: 384.
- Store embeddings using PostgreSQL pgvector.
- Use cosine similarity for retrieval.
- Support batch embedding.
- Implement retry and error handling.
- Prefer the configured Hugging Face inference API when supported.
- Provide a local embedding fallback using the same model.
- Do not silently switch to a different embedding model because the database vector dimension must remain consistent.

Use model configuration from environment variables where practical.

Suggested variables:

- `GROQ_API_KEY`
- `HF_TOKEN`
- `DATABASE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `LANGSMITH_API_KEY`

Verify the actual model availability and provider API compatibility before implementation.

Implement:

- Centralized LLM configuration.
- Model selection.
- Token usage tracking.
- Retry and timeout handling.
- Rate-limit handling.
- Provider error handling.
- Structured output validation.
- Usage and cost metadata where available.

Do not expose model provider credentials to the client.

---

# 4. CORE APPLICATION FEATURES

Build the following functionality.

## 4.1 Authentication and Authorization

Implement Better Auth in the Node.js backend.

Authentication methods:

- Google OAuth.
- GitHub OAuth.
- Email/password only if supported and configured by the chosen Better Auth setup.

Requirements:

- Session management.
- Login and logout.
- Session validation.
- User profile retrieval.
- OAuth account linking.
- Secure cookies.
- Authentication middleware.
- Protected routes.
- Workspace membership authorization.
- Resource ownership validation.

Important:

GitHub login and GitHub MCP authorization are separate systems.

Do not reuse Better Auth login tokens as GitHub MCP credentials.

Generate or verify the Better Auth-compatible Prisma models using the installed Better Auth version. Do not assume the existing schema automatically matches every adapter requirement.

## 4.2 Workspace Management

Implement:

- Create workspace.
- Update workspace.
- Delete workspace.
- List workspaces.
- Workspace membership.
- Invite members.
- Remove members.
- Update member roles.
- Workspace access validation.

Support workspace roles according to the existing Prisma schema.

Enforce authorization at the backend service layer, not only at the route layer.

## 4.3 Research Project Management

Implement:

- Create research project.
- Update project.
- Delete project.
- List projects.
- Retrieve project details.
- Project research history.
- Project documents.
- Project memory.
- Project reports.
- Project-level research settings.

Every project must belong to the correct workspace and be accessible only to authorized members.

## 4.4 Research Run Management

A research run represents one complete execution of a research request.

Implement:

- Create research run.
- Start execution.
- Pause execution where supported.
- Resume execution.
- Cancel execution.
- Retry failed execution.
- Retrieve execution status.
- Retrieve execution events.
- Retrieve task progress.
- Retrieve agent execution details.
- Retrieve generated reports.
- Retrieve sources and evidence.

Maintain proper status transitions.

Use the existing `ResearchRunStatus` enum and related schema models.

Prevent duplicate execution when a user submits the same start request repeatedly.

Use idempotency where appropriate.

Persist execution state so that interrupted runs can be recovered.

---

# 5. NODE-SERVER IMPLEMENTATION

Build the Node.js backend in a modular architecture.

Suggested structure:

backend/node-server/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── auth/
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── validators/
│   ├── repositories/
│   ├── utils/
│   ├── constants/
│   ├── integrations/
│   ├── app.js
│   └── server.js
├── tests/
├── .env.example
└── package.json

Adjust this structure only when necessary.

## 5.1 API Modules

Implement properly separated routes, controllers, services, and validation for:

### Authentication

`/api/auth/*`

Integrate Better Auth's supported handler and session mechanisms.

### User

`/api/users`

- GET `/me`
- PATCH `/me`
- GET `/me/preferences`
- PATCH `/me/preferences`

### Workspace

`/api/workspaces`

- POST `/`
- GET `/`
- GET `/:workspaceId`
- PATCH `/:workspaceId`
- DELETE `/:workspaceId`
- GET `/:workspaceId/members`
- POST `/:workspaceId/members`
- PATCH `/:workspaceId/members/:memberId`
- DELETE `/:workspaceId/members/:memberId`

### Projects

`/api/projects`

- POST `/`
- GET `/`
- GET `/:projectId`
- PATCH `/:projectId`
- DELETE `/:projectId`
- GET `/:projectId/runs`
- GET `/:projectId/reports`
- GET `/:projectId/documents`

### Research Runs

`/api/research`

- POST `/runs`
- GET `/runs`
- GET `/runs/:runId`
- POST `/runs/:runId/start`
- POST `/runs/:runId/pause`
- POST `/runs/:runId/resume`
- POST `/runs/:runId/cancel`
- POST `/runs/:runId/retry`
- GET `/runs/:runId/events`
- GET `/runs/:runId/tasks`
- GET `/runs/:runId/agents`
- GET `/runs/:runId/sources`
- GET `/runs/:runId/evidence`
- GET `/runs/:runId/report`

### Research Plans

`/api/plans`

- GET `/:runId`
- PATCH `/:planId`
- POST `/:planId/approve`
- POST `/:planId/reject`
- POST `/:planId/regenerate`

### Reports

`/api/reports`

- GET `/`
- GET `/:reportId`
- PATCH `/:reportId`
- DELETE `/:reportId`
- GET `/:reportId/citations`
- POST `/:reportId/exports`

### Documents

`/api/documents`

- POST `/`
- GET `/`
- GET `/:documentId`
- DELETE `/:documentId`
- POST `/:documentId/process`
- GET `/:documentId/status`

Support file validation, file-size limits, allowed file types, ownership checks, and secure storage.

Do not store large document contents directly in ordinary JSON fields unless the schema explicitly requires it. Use an appropriate file-storage strategy and persist metadata in PostgreSQL.

### Memory

`/api/memory`

- GET `/`
- POST `/`
- PATCH `/:memoryId`
- DELETE `/:memoryId`
- GET `/search`
- POST `/consolidate`

Respect user, workspace, and project memory scopes.

### MCP Management

`/api/mcp`

- GET `/servers`
- GET `/servers/:serverId`
- POST `/servers`
- PATCH `/servers/:serverId`
- DELETE `/servers/:serverId`
- POST `/servers/:serverId/connect`
- POST `/servers/:serverId/disconnect`
- POST `/servers/:serverId/refresh-tools`
- GET `/servers/:serverId/tools`
- GET `/tools`
- GET `/permissions`
- POST `/permissions`
- PATCH `/permissions/:permissionId`
- DELETE `/permissions/:permissionId`
- GET `/approvals`
- POST `/approvals/:approvalId/approve`
- POST `/approvals/:approvalId/reject`

Implement these APIs only when they make sense for the selected provider and MCP architecture. Never expose provider secrets in API responses.

### Analytics and Usage

`/api/analytics`

- GET `/overview`
- GET `/usage`
- GET `/runs`
- GET `/agents`
- GET `/models`

Return useful aggregate statistics based on persisted data.

## 5.2 Business Logic Requirements

Do not put business logic inside route handlers.

Use:

- Routes for endpoint registration.
- Controllers for request and response handling.
- Services for business rules.
- Repositories for database operations where useful.
- Zod for request validation.
- Middleware for authentication, authorization, rate limiting, and error handling.

Implement:

- Consistent API response format.
- Centralized error handling.
- Pagination.
- Filtering.
- Sorting.
- Search.
- Request validation.
- Proper HTTP status codes.
- Transaction handling for multi-table operations.
- Ownership checks.
- Role-based access control.
- Rate limiting.
- Request logging with sensitive data redaction.

Use native Fetch API for HTTP communication.

Do not use Axios.

## 5.3 Node-to-AI Communication

The Node backend must communicate with the Python AI backend over authenticated HTTP.

Node responsibilities:

1. Validate the authenticated user.
2. Validate project and workspace permissions.
3. Validate the research request.
4. Create the initial research run and required database records.
5. Send the execution request to FastAPI.
6. Handle AI-engine responses.
7. Return the run identifier and execution details.
8. Provide authenticated access to run information.

Python must not be trusted to accept arbitrary user IDs or workspace IDs without validation.

Implement internal service authentication using a dedicated secret or equivalent secure mechanism.

Use request timeouts and appropriate retry policies.

Do not retry non-idempotent research execution requests without an idempotency mechanism.

---

# 6. PYTHON AI-ENGINE IMPLEMENTATION

Build the AI engine using FastAPI and LangGraph.

Suggested structure:

backend/ai-engine/
├── agents/
├── graph/
├── nodes/
├── state/
├── prompts/
├── mcp/
├── tools/
├── rag/
├── embeddings/
├── retrieval/
├── verification/
├── synthesis/
├── reports/
├── memory/
├── database/
├── services/
├── schemas/
├── core/
├── utils/
├── tests/
├── main.py
├── requirements.txt
└── .env.example

Keep each agent, graph node, integration, and business responsibility modular.

## 6.1 FastAPI API Endpoints

Implement internal endpoints:

- POST `/api/v1/research/execute`
- POST `/api/v1/research/{run_id}/pause`
- POST `/api/v1/research/{run_id}/resume`
- POST `/api/v1/research/{run_id}/cancel`
- POST `/api/v1/research/{run_id}/retry`
- GET `/api/v1/research/{run_id}/status`
- GET `/api/v1/research/{run_id}/events`
- GET `/api/v1/research/{run_id}/stream`
- GET `/api/v1/research/{run_id}/result`
- POST `/api/v1/research/{run_id}/approve-plan`
- POST `/api/v1/research/{run_id}/reject-plan`

Also implement:

- GET `/health`
- GET `/ready`
- GET `/api/v1/mcp/health`
- GET `/api/v1/models/health`

Protect internal execution endpoints with service authentication.

Validate request schemas using Pydantic.

---

# 7. LANGGRAPH MULTI-AGENT ARCHITECTURE

The most important component is the agentic research workflow.

Do not implement this as a collection of independent LLM calls.

Build a proper LangGraph stateful workflow with:

- Shared state.
- Specialized agents.
- Conditional routing.
- Parallel execution.
- Loops.
- Retry mechanisms.
- Human approval.
- Persistent checkpoints.
- Failure recovery.
- Execution events.

## 7.1 Research Workflow

The overall execution should follow this flow:

User Query
    ↓
Research Intake Agent
    ↓
Research Planning Agent
    ↓
Plan Approval / Auto Approval
    ↓
Task Decomposition
    ↓
Parallel Research Execution
    ↓
Source Discovery
    ↓
Source Extraction
    ↓
Evidence Collection
    ↓
Claim Extraction
    ↓
Claim Verification
    ↓
Contradiction Detection
    ↓
Evidence Gap Analysis
    ↓
Additional Research Loop
    ↓
Research Synthesis
    ↓
Citation Validation
    ↓
Report Generation
    ↓
Quality Review
    ↓
Final Research Report

Use conditional routing to determine the next step.

Do not force every run through every node if some steps are unnecessary.

## 7.2 Agent Responsibilities

### Agent 1: Research Intake Agent

Responsibilities:

- Understand the user's research question.
- Identify the topic and domain.
- Determine research intent.
- Identify the expected output.
- Determine the required depth.
- Identify constraints.
- Detect ambiguous queries.
- Produce a structured research specification.

Output:

- Research objective.
- Topic.
- Research scope.
- Research depth.
- Expected report format.
- Research constraints.
- Search strategy requirements.

### Agent 2: Research Planning Agent

Responsibilities:

- Analyze the research objective.
- Identify major research dimensions.
- Break the objective into research questions.
- Identify subtopics.
- Create a structured research plan.
- Determine which research tools are required.
- Estimate task dependencies.
- Determine which tasks can run in parallel.

Generate:

- ResearchPlan.
- ResearchTask records.
- Task dependencies.
- Expected deliverables.
- Search strategies.
- Completion criteria.

### Agent 3: Research Coordinator Agent

Responsibilities:

- Manage the overall research workflow.
- Assign research tasks to specialized agents.
- Decide which agents should execute.
- Monitor task completion.
- Handle failed tasks.
- Reassign tasks where appropriate.
- Detect incomplete research.
- Trigger additional research loops.

Use LangGraph conditional edges and parallel branches.

Do not rely on an LLM for every simple routing decision. Use deterministic code where appropriate.

### Agent 4: Web Research Agent

Responsibilities:

- Search for relevant information.
- Use Tavily for general web research.
- Use Exa for semantic search.
- Discover relevant URLs.
- Rank search results.
- Remove duplicate URLs.
- Identify potentially authoritative sources.
- Extract source metadata.
- Record search queries and tool usage.

Support multiple searches in parallel when useful.

### Agent 5: Source Extraction Agent

Responsibilities:

- Extract relevant webpage content.
- Use Firecrawl where appropriate.
- Clean webpage content.
- Remove irrelevant navigation and boilerplate.
- Extract title, URL, author, publication date, and metadata where available.
- Preserve source provenance.
- Handle inaccessible URLs.
- Prevent duplicate source ingestion.

Use Tavily or Exa content when sufficient. Use Firecrawl when deeper extraction is required.

### Agent 6: Document Research Agent

Responsibilities:

- Process uploaded documents.
- Extract text.
- Split documents into chunks.
- Generate embeddings.
- Store document chunks.
- Retrieve relevant passages.
- Associate extracted information with document provenance.

Support common formats such as:

- PDF.
- DOCX.
- TXT.
- Markdown.

Apply file-size and parsing limits.

### Agent 7: Evidence Extraction Agent

Responsibilities:

- Identify factual statements.
- Extract evidence from sources.
- Create structured claims.
- Link claims to supporting source passages.
- Store evidence records.
- Track source locations and relevant text.
- Identify weak or incomplete evidence.

Every factual claim should preserve traceability to its original source.

### Agent 8: Verification Agent

Responsibilities:

- Verify claims against collected evidence.
- Determine whether evidence supports or contradicts a claim.
- Identify unsupported claims.
- Evaluate evidence quality.
- Detect conflicting statements.
- Identify outdated information.
- Assign verification status.
- Request further research when evidence is insufficient.

Use structured output.

Never mark a claim as verified solely because an LLM generated a confident answer.

### Agent 9: Contradiction Detection Agent

Responsibilities:

- Compare evidence from different sources.
- Identify conflicting claims.
- Identify differences in dates, numbers, definitions, or context.
- Distinguish genuine contradictions from different perspectives.
- Record relationships between claims and evidence.
- Send unresolved contradictions for additional research or qualification in the final report.

### Agent 10: Research Gap Analysis Agent

Responsibilities:

- Evaluate the research plan.
- Identify incomplete tasks.
- Detect missing evidence.
- Identify unsupported claims.
- Detect missing perspectives.
- Determine whether additional research is required.

Implement a controlled research loop.

Define:

- Maximum research iterations.
- Maximum task retries.
- Maximum execution time.
- Maximum tool calls.
- Maximum LLM token budget.

Do not allow infinite research loops.

### Agent 11: Research Synthesis Agent

Responsibilities:

- Combine verified findings.
- Organize information by research topic.
- Compare different perspectives.
- Summarize important findings.
- Preserve disagreements and uncertainty.
- Build a coherent research narrative.
- Reference evidence IDs for factual statements.

Do not introduce unsupported facts during synthesis.

### Agent 12: Citation Validation Agent

Responsibilities:

- Validate citation references.
- Ensure cited evidence exists.
- Ensure cited sources belong to the current research context.
- Detect missing citations.
- Detect broken or invalid source references.
- Identify unsupported statements.
- Ensure report citations point to the correct evidence or claims.

### Agent 13: Report Generation Agent

Responsibilities:

- Generate a structured Markdown report.
- Create an executive summary.
- Add an introduction.
- Organize research findings into sections.
- Include supporting evidence.
- Include contradictions and limitations.
- Include references and citations.
- Include methodology where relevant.
- Include a conclusion.

Store the final report in the database.

### Agent 14: Quality Review Agent

Responsibilities:

- Review the report for completeness.
- Check consistency.
- Check citation coverage.
- Detect repetitive content.
- Detect unsupported conclusions.
- Evaluate whether the original research objective was satisfied.
- Request limited corrections when necessary.

The report should only be marked completed after passing required validation.

## 7.3 LangGraph State

Create a typed, centralized state definition.

The state should include:

- `run_id`
- `user_id`
- `workspace_id`
- `project_id`
- `research_query`
- `research_specification`
- `research_plan`
- `tasks`
- `task_dependencies`
- `active_agents`
- `agent_results`
- `search_queries`
- `discovered_sources`
- `extracted_sources`
- `source_chunks`
- `claims`
- `evidence`
- `verification_results`
- `contradictions`
- `research_gaps`
- `research_iterations`
- `synthesis`
- `citations`
- `report`
- `errors`
- `execution_metadata`
- `current_status`

Avoid placing entire large documents or unbounded tool outputs into checkpoint state. Store large content in PostgreSQL and pass IDs or references through the graph.

Use reducers or other concurrency-safe state updates where parallel branches write to shared state.

## 7.4 Human-in-the-Loop

Implement plan approval.

When a research plan is generated:

1. Persist the plan.
2. Set the appropriate pending approval status.
3. Pause the graph using LangGraph interrupt functionality.
4. Notify the application through a research event.
5. Allow the user to approve, reject, or edit the plan.
6. Resume execution using the same checkpoint thread.
7. Continue from the correct graph state.

Also support cancellation and controlled pause/resume where technically appropriate.

Do not simulate pause or approval using a simple database status update while the graph continues running.

---

# 8. MCP INTEGRATION SYSTEM

Implement MCP as a first-class subsystem inside the Python AI engine.

## 8.1 MCP Providers

Initial providers:

### Tavily MCP

Use for:

- General web search.
- Current information discovery.
- Search result retrieval.
- Research source discovery.

### Exa MCP

Use for:

- Semantic search.
- Similarity-based content discovery.
- Research-oriented web search.
- Finding relevant sources using natural language.

### Firecrawl MCP

Use for:

- URL scraping.
- Website content extraction.
- Crawling relevant pages.
- Extracting structured webpage content.

### GitHub MCP

Use for:

- Repository search.
- Code research.
- Repository information.
- Issues and pull requests.
- Documentation research.

Begin with read-only GitHub functionality unless a user explicitly authorizes a write operation.

## 8.2 MCP Manager

Create a centralized MCP manager.

Responsibilities:

- Register MCP providers.
- Establish remote connections.
- Authenticate connections.
- Discover available tools.
- Retrieve tool descriptions and schemas.
- Refresh tool metadata.
- Maintain connection status.
- Invoke tools dynamically.
- Handle tool errors.
- Handle connection timeouts.
- Reconnect when appropriate.
- Log tool execution.
- Track execution duration.
- Track tool usage.
- Enforce permissions.
- Enforce approval requirements.
- Handle provider rate limits.
- Disconnect cleanly.

Do not create one hardcoded implementation per tool.

Build a generic MCP client abstraction that can support new providers.

## 8.3 Dynamic Tool Discovery

When an MCP server connects:

1. Establish a supported MCP transport.
2. Initialize the MCP session.
3. Discover tools using the MCP protocol.
4. Retrieve tool names, descriptions, and input schemas.
5. Validate returned schemas.
6. Store tool metadata in the database.
7. Make tools available to the agent tool registry.
8. Refresh tool metadata when required.

The agent system must use the discovered tools, not a manually maintained list of assumed tool names.

## 8.4 Agent-to-MCP Tool Routing

Build a tool registry and routing mechanism.

For every agent tool request:

1. Identify the requested capability.
2. Find compatible discovered MCP tools.
3. Check whether the provider is connected.
4. Validate the input against the discovered schema.
5. Check user/workspace permissions.
6. Check whether approval is required.
7. Execute the MCP tool.
8. Capture the result.
9. Normalize the output.
10. Persist the tool-call record.
11. Return the result to the calling agent.

Use `langchain-mcp-adapters` where appropriate to expose discovered MCP tools to LangChain/LangGraph agents.

Do not allow agents to invoke arbitrary MCP tools without authorization.

## 8.5 MCP Permissions and Approvals

Implement:

- Global provider configuration.
- User-level permissions.
- Workspace-level permissions.
- Tool-level permissions.
- Read-only and write permissions.
- Approval-required tools.
- Approval request creation.
- Approval/rejection workflow.
- Permission validation before execution.

Sensitive operations must require explicit approval.

Treat all MCP responses and external website content as untrusted data.

Prevent prompt injection from webpage content and tool responses.

Never treat instructions found in retrieved content as system instructions.

## 8.6 MCP Security

Implement:

- Secure credential storage.
- Token encryption at rest.
- Secret redaction.
- Connection timeouts.
- Request limits.
- Tool output limits.
- Server endpoint validation.
- SSRF protection.
- HTTPS enforcement where appropriate.
- Restricted redirects and private-network access.
- Safe error messages.
- Audit logging.

Do not expose raw credentials through APIs or logs.

---

# 9. RAG AND DOCUMENT INTELLIGENCE

Implement a proper RAG pipeline.

## 9.1 Document Ingestion

Workflow:

Document Upload
    ↓
File Validation
    ↓
Text Extraction
    ↓
Text Cleaning
    ↓
Chunking
    ↓
Embedding Generation
    ↓
pgvector Storage
    ↓
Document Ready

Use suitable Python libraries for PDF, DOCX, TXT, and Markdown processing.

Store:

- Document metadata.
- Original file reference.
- Chunk content.
- Chunk index.
- Page number or source location when available.
- Embedding.
- Related workspace/project/run information.

## 9.2 Chunking

Implement configurable chunking.

Use:

- Appropriate chunk size.
- Overlapping chunks.
- Metadata preservation.
- Stable chunk identifiers.

Avoid arbitrary splitting that destroys the meaning of paragraphs or sections.

## 9.3 Retrieval

Implement vector similarity search using pgvector.

Requirements:

- Query embedding generation.
- Cosine similarity.
- Top-K retrieval.
- Metadata filtering.
- Workspace isolation.
- Project isolation.
- Source attribution.
- Optional keyword search or hybrid retrieval.

Ensure that a user cannot retrieve another workspace's private documents.

## 9.4 Research RAG

Use the RAG system to:

- Retrieve uploaded documents.
- Retrieve previous research evidence.
- Retrieve relevant project knowledge.
- Support research synthesis.
- Support follow-up questions.
- Reuse previous research without blindly trusting stale information.

Every retrieved passage must retain its source and provenance.

---

# 10. MEMORY SYSTEM

Implement persistent memory using the existing `ResearchMemory` and `ResearchMemorySource` models.

Support three scopes:

1. USER
2. WORKSPACE
3. PROJECT

Memory functionality:

- Create memory.
- Retrieve memory.
- Search memory.
- Update memory.
- Delete memory.
- Generate memory embeddings.
- Retrieve semantically similar memories.
- Associate memories with source snapshots.
- Consolidate duplicate memories.
- Identify outdated or conflicting memories.
- Respect memory scope and permissions.

Do not store every conversation or research event as permanent memory.

Extract useful, reusable information only.

Ensure that user memory cannot leak into another user's context and workspace memory cannot leak across workspaces.

---

# 11. DATABASE AND PERSISTENCE

Use the provided Neon PostgreSQL database.

Prisma is the primary ORM and the sole migration manager.

Important database rules:

1. Node.js owns Prisma schema and migrations.
2. Python uses a lightweight database repository layer with `psycopg`.
3. Python must not create a separate schema or migration system.
4. Redis is for caching, rate limiting, and temporary coordination — not persistent source-of-truth data.
5. Use pgvector for 384-dimensional embeddings.
6. Use LangGraph PostgreSQL checkpointing for graph execution state.

## 11.1 Prisma

Use the existing `schema.prisma`.

Review:

- Model relationships.
- Foreign keys.
- Unique constraints.
- Indexes.
- Cascading behavior.
- Nullable relationships.
- Enums.
- Better Auth compatibility.
- Vector fields.
- MCP permission constraints.

Do not casually remove existing models or fields.

Create migrations through Prisma Migrate.

Use raw SQL inside Prisma-managed migrations only when needed for:

- pgvector extension.
- Vector columns.
- HNSW indexes.
- Database CHECK constraints.
- LangGraph checkpoint table DDL.

## 11.2 pgvector

Use:

`vector(384)`

For:

- Source chunks.
- Research memory.
- Knowledge graph nodes, if embeddings are enabled for them.

Use cosine similarity indexes where appropriate.

Inspect generated migrations carefully to avoid duplicate or missing columns.

## 11.3 LangGraph Checkpointing

Use the official PostgreSQL checkpoint implementation compatible with the installed LangGraph version.

Persist:

- Graph thread ID.
- Checkpoint state.
- Pending interrupts.
- Execution metadata.

Integrate its database setup into Prisma-managed migrations.

Do not let the Python application run schema migrations automatically at startup.

Verify the exact checkpoint package DDL for the installed version.

## 11.4 Data Integrity

Enforce important business rules:

- Memory scope must match its owner reference.
- MCP permissions must have valid scope.
- Report citations must reference valid claims or evidence.
- Tasks cannot depend on themselves.
- Task dependency cycles must be prevented.
- A research snapshot must belong to the correct source.
- MCP tool calls must reference a tool belonging to the correct server.
- Only authorized workspace members can access workspace resources.

Use database constraints wherever practical and application-level validation for complex cross-record rules.

---

# 12. REAL-TIME EXECUTION EVENTS

Implement Server-Sent Events (SSE) from FastAPI.

The frontend will be built separately, so establish a clear and documented streaming contract.

Stream events such as:

- `run.started`
- `run.status_changed`
- `plan.generated`
- `plan.awaiting_approval`
- `plan.approved`
- `task.created`
- `task.started`
- `task.completed`
- `task.failed`
- `agent.started`
- `agent.progress`
- `agent.completed`
- `agent.failed`
- `mcp.connected`
- `mcp.tool_started`
- `mcp.tool_completed`
- `source.discovered`
- `source.extracted`
- `evidence.created`
- `claim.verified`
- `claim.contradicted`
- `research.gap_detected`
- `research.additional_iteration`
- `report.generating`
- `report.completed`
- `run.completed`
- `run.failed`
- `run.cancelled`

Each event should contain:

- Event ID.
- Run ID.
- Event type.
- Timestamp.
- Relevant entity ID.
- Safe event payload.

Persist important events in the `ResearchEvent` table.

Implement:

- Ordered event sequence.
- Reconnection support.
- Last-Event-ID handling.
- Heartbeats.
- Client disconnect handling.
- Event filtering.
- Authorization.
- Safe error handling.

Ensure that events are not duplicated or incorrectly ordered during parallel execution.

Use a concurrency-safe event sequence allocation mechanism.

Do not expose internal stack traces, secrets, or raw sensitive tool outputs in SSE events.

---

# 13. REPORTING AND CITATION SYSTEM

Reports are a core product feature.

Implement:

- Markdown report generation.
- Executive summary.
- Introduction.
- Research methodology.
- Detailed findings.
- Supporting evidence.
- Contradictions and different perspectives.
- Limitations.
- Conclusion.
- References.

Citation requirements:

- Every citation must map to an existing source, evidence record, or claim.
- Preserve the original source URL.
- Preserve source metadata.
- Store citation numbering per report.
- Validate citation references before completion.
- Avoid invented URLs.
- Avoid citations to sources that were never retrieved.
- Distinguish direct evidence from AI-generated interpretation.

Use the existing `ResearchReport`, `ReportCitation`, `ResearchClaim`, `Evidence`, and `ResearchSource` models.

Support report export to:

- Markdown.
- PDF.
- DOCX.

Implement export processing as a backend service and persist export status.

---

# 14. KNOWLEDGE GRAPH

Use the existing knowledge graph models if they are present in the schema.

Implement the backend logic for:

- Creating knowledge nodes.
- Creating relationships.
- Connecting claims, sources, concepts, and entities.
- Searching related nodes.
- Retrieving graph neighborhoods.
- Filtering by workspace and project.
- Detecting duplicate nodes.
- Maintaining source provenance.

Support relationship types from the existing schema.

Do not introduce an additional graph database for the initial implementation.

Use PostgreSQL as the source of truth.

The frontend will visualize the graph separately.

---

# 15. REDIS

Use Redis for:

- API rate limiting.
- Frequently accessed metadata caching.
- Temporary execution coordination.
- Short-lived locks where required.
- Temporary deduplication keys.
- Provider throttling.

Do not store the only copy of research runs, reports, agent state, events, or user memory in Redis.

Use Redis only where it improves performance or coordination.

---

# 16. PHASE-WISE DEVELOPMENT PLAN

Complete the project in the following phases.

Do not jump directly to advanced agent functionality before the foundational backend works.

## PHASE 1 — Project Foundation and Database

Tasks:

1. Inspect the existing repository.
2. Inspect the Prisma schema.
3. Inspect all environment variables without exposing their values.
4. Verify installed software and dependency versions.
5. Create the Node.js project foundation.
6. Create the Python FastAPI project foundation.
7. Configure environment loading.
8. Configure structured logging.
9. Configure centralized error handling.
10. Configure Prisma Client.
11. Connect to Neon PostgreSQL.
12. Validate database connectivity.
13. Review Better Auth schema compatibility.
14. Review pgvector configuration.
15. Prepare Prisma migrations.
16. Integrate the LangGraph checkpoint database requirements through Prisma-managed migrations.
17. Create health-check endpoints.
18. Create `.env.example` files.

Deliverables:

- Working Node server.
- Working FastAPI server.
- Successful Neon connection.
- Valid Prisma schema.
- Successful database migrations.
- Health endpoints.
- Initial tests.

Do not proceed until the database and application foundations work.

## PHASE 2 — Authentication and Access Control

Tasks:

1. Configure Better Auth.
2. Integrate Google OAuth.
3. Integrate GitHub OAuth.
4. Implement session validation.
5. Implement user APIs.
6. Implement authentication middleware.
7. Implement workspace authorization.
8. Implement role-based access control.
9. Implement resource ownership validation.
10. Implement secure internal Node-to-Python authentication.
11. Add authentication tests.

Deliverables:

- Working authentication.
- Protected Node APIs.
- User profile APIs.
- Secure service-to-service communication.

## PHASE 3 — Core Application Business Logic

Tasks:

1. Workspace CRUD.
2. Workspace membership.
3. Project CRUD.
4. Research run CRUD.
5. Research plan management.
6. Research task management.
7. Task dependency management.
8. Research history.
9. Report retrieval.
10. Document metadata management.
11. User preferences.
12. API pagination, filtering, and validation.

Deliverables:

- Complete Node application APIs.
- Proper business logic.
- Database persistence.
- Authorization tests.

## PHASE 4 — AI Engine Foundation

Tasks:

1. Configure Groq integration.
2. Configure Hugging Face embedding integration.
3. Implement local embedding fallback.
4. Implement centralized model configuration.
5. Implement LLM service abstraction.
6. Implement structured output validation.
7. Implement token usage tracking.
8. Implement FastAPI internal endpoints.
9. Implement Python database repository.
10. Implement LangGraph PostgreSQL checkpointing.
11. Implement execution state management.
12. Implement basic AI-engine tests.

Deliverables:

- Working LLM integration.
- Working embeddings.
- Working Python database access.
- Working graph checkpointing.

## PHASE 5 — MCP Integration System

Tasks:

1. Implement generic MCP client manager.
2. Integrate Tavily MCP.
3. Integrate Exa MCP.
4. Integrate Firecrawl MCP.
5. Integrate GitHub MCP.
6. Implement connection lifecycle.
7. Implement authentication.
8. Implement dynamic tool discovery.
9. Implement tool metadata persistence.
10. Implement generic tool registry.
11. Implement dynamic tool invocation.
12. Implement tool input validation.
13. Implement permission checks.
14. Implement tool execution logging.
15. Implement approval requests.
16. Implement connection health monitoring.
17. Implement retries and error handling.
18. Implement security protections.
19. Test each MCP provider independently.

Deliverables:

- Functional MCP client subsystem.
- Dynamically discovered tools.
- Working provider connections.
- Permission-controlled tool execution.
- MCP management APIs.

Do not proceed using mocked MCP tools when real provider credentials are configured. If a provider cannot connect, report the exact sanitized error and continue developing independent components.

## PHASE 6 — Research Agents and LangGraph

Build the complete multi-agent research system.

Tasks:

1. Define centralized graph state.
2. Implement Research Intake Agent.
3. Implement Research Planning Agent.
4. Implement Research Coordinator Agent.
5. Implement Web Research Agent.
6. Implement Source Extraction Agent.
7. Implement Document Research Agent.
8. Implement Evidence Extraction Agent.
9. Implement Verification Agent.
10. Implement Contradiction Detection Agent.
11. Implement Research Gap Analysis Agent.
12. Implement Research Synthesis Agent.
13. Implement Citation Validation Agent.
14. Implement Report Generation Agent.
15. Implement Quality Review Agent.
16. Create LangGraph nodes.
17. Create conditional routing.
18. Create parallel task execution.
19. Implement task dependencies.
20. Implement controlled research loops.
21. Implement retry and recovery logic.
22. Implement human-in-the-loop plan approval.
23. Implement pause, resume, and cancellation.
24. Persist graph execution state.

Deliverables:

- Complete LangGraph workflow.
- Specialized functional agents.
- Dynamic research planning.
- Parallel research.
- Evidence verification.
- Controlled research iteration.
- Human approval.
- Persistent execution.

## PHASE 7 — RAG, Documents, and Memory

Tasks:

1. Implement document ingestion.
2. Implement PDF parsing.
3. Implement DOCX parsing.
4. Implement TXT and Markdown parsing.
5. Implement text cleaning.
6. Implement chunking.
7. Implement embedding generation.
8. Implement pgvector storage.
9. Implement vector similarity search.
10. Implement metadata filtering.
11. Implement source attribution.
12. Implement research evidence retrieval.
13. Implement user memory.
14. Implement workspace memory.
15. Implement project memory.
16. Implement semantic memory search.
17. Implement memory consolidation.
18. Implement memory permissions.

Deliverables:

- Working RAG pipeline.
- Document intelligence.
- Persistent vector search.
- Scoped memory system.

## PHASE 8 — Real-Time Events and Research Execution

Tasks:

1. Implement event creation.
2. Implement persistent research events.
3. Implement SSE.
4. Implement event sequencing.
5. Implement reconnect support.
6. Implement Last-Event-ID.
7. Implement heartbeats.
8. Implement agent progress events.
9. Implement MCP tool events.
10. Implement source and evidence events.
11. Implement report generation events.
12. Integrate Node research APIs with FastAPI execution.
13. Implement run status synchronization.
14. Implement cancellation and failure propagation.
15. Test concurrent research runs.

Deliverables:

- Complete execution pipeline.
- Real-time SSE event stream.
- Persistent execution history.
- Reliable run status management.

## PHASE 9 — Reports, Knowledge Graph, and Analytics

Tasks:

1. Implement final Markdown reports.
2. Implement citation management.
3. Implement citation validation.
4. Implement PDF export.
5. Implement DOCX export.
6. Implement Markdown export.
7. Implement knowledge graph nodes.
8. Implement knowledge graph relationships.
9. Implement graph search.
10. Implement analytics APIs.
11. Implement LLM usage analytics.
12. Implement agent execution analytics.
13. Implement research run analytics.
14. Implement MCP usage analytics.

Deliverables:

- Complete reporting subsystem.
- Export services.
- Knowledge graph APIs.
- Analytics APIs.

## PHASE 10 — Testing, Security, and Integration

Perform a complete backend audit.

### Functional testing

Test:

- Authentication.
- OAuth callbacks.
- Workspace permissions.
- Project operations.
- Research run lifecycle.
- Research planning.
- Plan approval.
- Agent execution.
- MCP connections.
- MCP tool discovery.
- MCP tool execution.
- Source extraction.
- Evidence creation.
- Claim verification.
- Contradiction detection.
- RAG retrieval.
- Memory isolation.
- Report generation.
- Citation validation.
- SSE streaming.
- Pause/resume.
- Cancellation.
- Retry and recovery.

### Security testing

Check:

- Unauthorized access.
- Cross-workspace data access.
- Broken object-level authorization.
- SSRF.
- Prompt injection.
- MCP tool permission bypass.
- OAuth token leakage.
- API key leakage.
- File upload vulnerabilities.
- SQL injection.
- Unsafe error responses.
- Rate-limit bypass.
- Unbounded tool outputs.

### Reliability testing

Check:

- Concurrent runs.
- Provider failures.
- LLM rate limits.
- MCP disconnections.
- Database failures.
- Redis failures.
- Partial agent failures.
- Duplicate requests.
- Interrupted executions.
- Checkpoint recovery.

Deliverables:

- Test suite.
- Security fixes.
- Integration test results.
- Stable backend.

## PHASE 11 — Documentation and Final Integration

Create:

- Backend README.
- Architecture documentation.
- Database documentation.
- API endpoint documentation.
- API request/response examples.
- Agent workflow documentation.
- MCP integration documentation.
- Environment variable documentation.
- Local setup instructions.
- Migration instructions.
- Testing instructions.
- Error handling documentation.

Use OpenAPI documentation for FastAPI.

Document Node APIs separately or provide a unified API specification.

Create a clear integration contract for the future frontend developer, covering:

- Authentication.
- API base URLs.
- Request formats.
- Response formats.
- Research run lifecycle.
- SSE event names and payloads.
- Plan approval.
- Reports.
- Sources.
- Evidence.
- MCP management.

---

# 17. ENGINEERING RULES

Follow these rules throughout implementation.

1. Build actual functionality, not placeholder code.
2. Do not create empty controllers or fake services just to satisfy the folder structure.
3. Do not use mock LLM responses when real credentials are available.
4. Do not hardcode API keys.
5. Do not hardcode MCP tool names.
6. Do not duplicate business logic between Node and Python.
7. Node owns application APIs, authentication, and Prisma.
8. Python owns AI orchestration, RAG, agent logic, and MCP execution.
9. Use PostgreSQL as the persistent source of truth.
10. Use Redis only for caching and temporary coordination.
11. Use proper asynchronous execution.
12. Use structured logging.
13. Validate all external inputs.
14. Preserve source provenance.
15. Never fabricate citations.
16. Handle failures at individual agent and provider levels.
17. Avoid unnecessary abstractions and overengineering.
18. Use clear naming and modular code.
19. Add tests for important business logic.
20. Never silently swallow errors.
21. Do not store secrets in the database without encryption.
22. Do not allow one workspace to access another workspace's private data.
23. Ensure all long-running research execution can be recovered.
24. Do not introduce a frontend dependency or frontend implementation.
25. Do not introduce deployment, AWS, Kubernetes, or CI/CD work in this task.

---

# 18. PHASE COMPLETION REQUIREMENTS

Complete phases sequentially.

At the end of each phase:

1. Summarize what was implemented.
2. List the files created or modified.
3. Explain important architectural decisions.
4. List the APIs implemented.
5. List the database changes and migrations.
6. Run relevant tests.
7. Report passing and failing tests.
8. Identify unresolved issues.
9. Verify that the completed phase does not break earlier phases.

Do not mark a phase complete merely because code has been generated.

A phase is complete only when its functionality has been implemented and tested to a reasonable level.

Continue to the next phase after the current phase passes its completion checks. Do not repeatedly ask for permission between phases unless a genuine decision, credential, destructive action, or external authorization is required.

If an external provider is unavailable, isolate the failure, explain it, and continue with independent development.

Never fabricate successful test results.

---

# 19. FINAL EXPECTED RESULT

At completion, ResearchForge should have a fully functional backend with:

- Google and GitHub authentication.
- User and workspace management.
- Project management.
- Research run management.
- Research planning.
- Human-approved research plans.
- Multi-agent LangGraph orchestration.
- Parallel research execution.
- Dynamic remote MCP integration.
- Tavily, Exa, Firecrawl, and GitHub MCP support.
- Dynamic MCP tool discovery and invocation.
- MCP permissions and approval workflows.
- Source discovery and extraction.
- Evidence collection.
- Claim verification.
- Contradiction detection.
- Research gap analysis.
- Additional research loops.
- RAG over web sources and uploaded documents.
- pgvector embeddings and retrieval.
- User, workspace, and project memory.
- Research synthesis.
- Citation validation.
- Markdown research reports.
- PDF and DOCX exports.
- Knowledge graph persistence.
- Persistent LangGraph checkpoints.
- Real-time SSE progress events.
- Research history and recovery.
- LLM usage analytics.
- MCP execution analytics.
- Complete API documentation.
- Automated tests.

The final architecture must be ready for a separately developed Next.js frontend to consume.

**Start by inspecting the existing repository, `schema.prisma`, and environment configuration. Then implement the phases sequentially. Do not start building the frontend.**