-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ResearchRunStatus" AS ENUM ('QUEUED', 'PLANNING', 'RUNNING', 'VERIFYING', 'SYNTHESIZING', 'WAITING_FOR_APPROVAL', 'PAUSED', 'REQUIRES_INPUT', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'READY', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "EventSeverity" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('WEB', 'ACADEMIC', 'REPOSITORY', 'DOCUMENT', 'API', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('DISCOVERED', 'EXTRACTED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'PARTIALLY_VERIFIED', 'CONTRADICTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EvidenceRelationship" AS ENUM ('SUPPORTS', 'CONTRADICTS', 'CONTEXTUALIZES');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('PDF', 'DOCX', 'MARKDOWN', 'HTML');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('RESEARCH_FINDING', 'USER_PREFERENCE', 'PROJECT_CONTEXT', 'IMPORTANT_FACT', 'RESEARCH_SUMMARY');

-- CreateEnum
CREATE TYPE "MemoryScope" AS ENUM ('USER', 'WORKSPACE', 'PROJECT');

-- CreateEnum
CREATE TYPE "MCPTransport" AS ENUM ('STREAMABLE_HTTP', 'SSE');

-- CreateEnum
CREATE TYPE "MCPAuthType" AS ENUM ('NONE', 'API_KEY', 'OAUTH', 'BEARER_TOKEN');

-- CreateEnum
CREATE TYPE "MCPConnectionStatus" AS ENUM ('UNKNOWN', 'CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "MCPToolCallStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('GITHUB', 'GOOGLE', 'OTHER');

-- CreateEnum
CREATE TYPE "KnowledgeNodeType" AS ENUM ('TOPIC', 'CONCEPT', 'CLAIM', 'ENTITY', 'SOURCE', 'TECHNOLOGY', 'PERSON', 'ORGANIZATION', 'OTHER');

-- CreateEnum
CREATE TYPE "KnowledgeRelationType" AS ENUM ('RELATED_TO', 'SUPPORTS', 'CONTRADICTS', 'DEPENDS_ON', 'PART_OF', 'COMPARES_WITH', 'REFERENCES', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "LLMProvider" AS ENUM ('GROQ', 'HUGGINGFACE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "ResearchProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchRun" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "status" "ResearchRunStatus" NOT NULL DEFAULT 'QUEUED',
    "configuration" JSONB,
    "configurationVersion" INTEGER NOT NULL DEFAULT 1,
    "graphThreadId" TEXT,
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,

    CONSTRAINT "ResearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchPlan" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "objective" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "runId" TEXT NOT NULL,
    "approvedById" TEXT,

    CONSTRAINT "ResearchPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedAgent" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "input" JSONB,
    "output" JSONB,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "runId" TEXT NOT NULL,
    "planId" TEXT,
    "parentTaskId" TEXT,

    CONSTRAINT "ResearchTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchTaskDependency" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "dependsOnId" TEXT NOT NULL,

    CONSTRAINT "ResearchTaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentExecution" (
    "id" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'PENDING',
    "sequence" INTEGER NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "iteration" INTEGER NOT NULL DEFAULT 1,
    "modelProvider" TEXT,
    "modelName" TEXT,
    "input" JSONB,
    "output" JSONB,
    "errorMessage" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runId" TEXT NOT NULL,
    "taskId" TEXT,
    "parentExecutionId" TEXT,

    CONSTRAINT "AgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchEvent" (
    "id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" "EventSeverity" NOT NULL DEFAULT 'INFO',
    "agentName" TEXT,
    "message" TEXT,
    "payload" JSONB,
    "eventKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runId" TEXT NOT NULL,
    "taskId" TEXT,
    "agentExecutionId" TEXT,

    CONSTRAINT "ResearchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchSource" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "canonicalUrlHash" TEXT NOT NULL,
    "title" TEXT,
    "domain" TEXT,
    "author" TEXT,
    "sourceType" "SourceType" NOT NULL DEFAULT 'WEB',
    "status" "SourceStatus" NOT NULL DEFAULT 'DISCOVERED',
    "publishedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "ResearchSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceSnapshot" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "extractedText" TEXT,
    "summary" TEXT,
    "extractionMetadata" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "SourceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchRunSource" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "discoveryMethod" TEXT,
    "relevanceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchRunSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceChunk" (
    "id" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "metadata" JSONB,
    "embeddingModel" TEXT,
    "embeddedAt" TIMESTAMP(3),
    "embedding" vector(384),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotId" TEXT NOT NULL,

    CONSTRAINT "SourceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchClaim" (
    "id" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "explanation" TEXT,
    "confidence" DOUBLE PRECISION,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "runId" TEXT NOT NULL,

    CONSTRAINT "ResearchClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "supportingQuote" TEXT NOT NULL,
    "location" TEXT,
    "pageNumber" INTEGER,
    "paragraphIndex" INTEGER,
    "confidence" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotId" TEXT NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimEvidence" (
    "id" TEXT NOT NULL,
    "relationship" "EvidenceRelationship" NOT NULL,
    "explanation" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,

    CONSTRAINT "ClaimEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchReport" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "executiveSummary" TEXT,
    "contentMarkdown" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "runId" TEXT NOT NULL,

    CONSTRAINT "ResearchReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCitation" (
    "id" TEXT NOT NULL,
    "citationNumber" INTEGER NOT NULL,
    "locator" TEXT,
    "anchor" TEXT,
    "citationText" TEXT,
    "claimId" TEXT,
    "reportId" TEXT NOT NULL,
    "evidenceId" TEXT,

    CONSTRAINT "ReportCitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT,
    "fileName" TEXT,
    "fileSize" BIGINT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "reportId" TEXT NOT NULL,

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchMemory" (
    "id" TEXT NOT NULL,
    "type" "MemoryType" NOT NULL,
    "scope" "MemoryScope" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector(384),
    "embeddingModel" TEXT,
    "embeddedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT,
    "userId" TEXT,
    "createdById" TEXT,
    "sourceRunId" TEXT,

    CONSTRAINT "ResearchMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchMemorySource" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,

    CONSTRAINT "ResearchMemorySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCPServer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "endpoint" TEXT NOT NULL,
    "transport" "MCPTransport" NOT NULL DEFAULT 'STREAMABLE_HTTP',
    "authType" "MCPAuthType" NOT NULL DEFAULT 'NONE',
    "status" "MCPConnectionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "encryptedCredentials" TEXT,
    "configuration" JSONB,
    "serverInfo" JSONB,
    "capabilities" JSONB,
    "protocolVersion" TEXT,
    "lastConnectedAt" TIMESTAMP(3),
    "lastHealthCheckAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "MCPServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCPTool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inputSchema" JSONB,
    "outputSchema" JSONB,
    "annotations" JSONB,
    "schemaHash" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "serverId" TEXT NOT NULL,

    CONSTRAINT "MCPTool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCPToolCall" (
    "id" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "status" "MCPToolCallStatus" NOT NULL DEFAULT 'PENDING',
    "arguments" JSONB,
    "result" JSONB,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" TEXT,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runId" TEXT NOT NULL,
    "serverId" TEXT,
    "toolId" TEXT,

    CONSTRAINT "MCPToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCPToolPermission" (
    "id" TEXT NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "workspaceRole" "WorkspaceRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serverId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "MCPToolPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCPApprovalRequest" (
    "id" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByAgent" TEXT NOT NULL,
    "requestReason" TEXT,
    "reviewComment" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "toolCallId" TEXT NOT NULL,
    "requestedById" TEXT,
    "reviewedById" TEXT,

    CONSTRAINT "MCPApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalConnection" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "accountName" TEXT,
    "externalAccountId" TEXT,
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scopes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ExternalConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LLMInvocation" (
    "id" TEXT NOT NULL,
    "provider" "LLMProvider" NOT NULL,
    "modelName" TEXT NOT NULL,
    "operation" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "estimatedCost" DECIMAL(12,8),
    "durationMs" INTEGER,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runId" TEXT NOT NULL,
    "agentExecutionId" TEXT,

    CONSTRAINT "LLMInvocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAsset" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "contentHash" TEXT,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT,
    "runId" TEXT,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "DocumentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "KnowledgeNodeType" NOT NULL,
    "metadata" JSONB,
    "embedding" vector(384),
    "embeddingModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEdge" (
    "id" TEXT NOT NULL,
    "relationship" "KnowledgeRelationType" NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");

-- CreateIndex
CREATE INDEX "Workspace_createdAt_idx" ON "Workspace"("createdAt");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "ResearchProject_workspaceId_status_idx" ON "ResearchProject"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ResearchProject_createdById_idx" ON "ResearchProject"("createdById");

-- CreateIndex
CREATE INDEX "ResearchProject_createdAt_idx" ON "ResearchProject"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchRun_graphThreadId_key" ON "ResearchRun"("graphThreadId");

-- CreateIndex
CREATE INDEX "ResearchRun_projectId_createdAt_idx" ON "ResearchRun"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchRun_requestedById_createdAt_idx" ON "ResearchRun"("requestedById", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchRun_status_createdAt_idx" ON "ResearchRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchPlan_runId_status_idx" ON "ResearchPlan"("runId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchPlan_runId_version_key" ON "ResearchPlan"("runId", "version");

-- CreateIndex
CREATE INDEX "ResearchTask_runId_status_idx" ON "ResearchTask"("runId", "status");

-- CreateIndex
CREATE INDEX "ResearchTask_planId_idx" ON "ResearchTask"("planId");

-- CreateIndex
CREATE INDEX "ResearchTask_parentTaskId_idx" ON "ResearchTask"("parentTaskId");

-- CreateIndex
CREATE INDEX "ResearchTask_assignedAgent_idx" ON "ResearchTask"("assignedAgent");

-- CreateIndex
CREATE INDEX "ResearchTaskDependency_dependsOnId_idx" ON "ResearchTaskDependency"("dependsOnId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchTaskDependency_taskId_dependsOnId_key" ON "ResearchTaskDependency"("taskId", "dependsOnId");

-- CreateIndex
CREATE INDEX "AgentExecution_runId_status_idx" ON "AgentExecution"("runId", "status");

-- CreateIndex
CREATE INDEX "AgentExecution_taskId_idx" ON "AgentExecution"("taskId");

-- CreateIndex
CREATE INDEX "AgentExecution_parentExecutionId_idx" ON "AgentExecution"("parentExecutionId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentExecution_runId_sequence_key" ON "AgentExecution"("runId", "sequence");

-- CreateIndex
CREATE INDEX "ResearchEvent_runId_createdAt_idx" ON "ResearchEvent"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchEvent_taskId_idx" ON "ResearchEvent"("taskId");

-- CreateIndex
CREATE INDEX "ResearchEvent_agentExecutionId_idx" ON "ResearchEvent"("agentExecutionId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchEvent_runId_sequence_key" ON "ResearchEvent"("runId", "sequence");

-- CreateIndex
CREATE INDEX "ResearchSource_workspaceId_sourceType_idx" ON "ResearchSource"("workspaceId", "sourceType");

-- CreateIndex
CREATE INDEX "ResearchSource_domain_idx" ON "ResearchSource"("domain");

-- CreateIndex
CREATE INDEX "ResearchSource_status_idx" ON "ResearchSource"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchSource_workspaceId_canonicalUrlHash_key" ON "ResearchSource"("workspaceId", "canonicalUrlHash");

-- CreateIndex
CREATE INDEX "SourceSnapshot_sourceId_fetchedAt_idx" ON "SourceSnapshot"("sourceId", "fetchedAt");

-- CreateIndex
CREATE INDEX "SourceSnapshot_contentHash_idx" ON "SourceSnapshot"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "SourceSnapshot_sourceId_version_key" ON "SourceSnapshot"("sourceId", "version");

-- CreateIndex
CREATE INDEX "ResearchRunSource_sourceId_idx" ON "ResearchRunSource"("sourceId");

-- CreateIndex
CREATE INDEX "ResearchRunSource_runId_relevanceScore_idx" ON "ResearchRunSource"("runId", "relevanceScore");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchRunSource_runId_sourceId_key" ON "ResearchRunSource"("runId", "sourceId");

-- CreateIndex
CREATE INDEX "SourceChunk_snapshotId_idx" ON "SourceChunk"("snapshotId");

-- CreateIndex
CREATE INDEX "SourceChunk_contentHash_idx" ON "SourceChunk"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "SourceChunk_snapshotId_chunkIndex_key" ON "SourceChunk"("snapshotId", "chunkIndex");

-- CreateIndex
CREATE INDEX "ResearchClaim_runId_status_idx" ON "ResearchClaim"("runId", "status");

-- CreateIndex
CREATE INDEX "Evidence_snapshotId_idx" ON "Evidence"("snapshotId");

-- CreateIndex
CREATE INDEX "ClaimEvidence_evidenceId_idx" ON "ClaimEvidence"("evidenceId");

-- CreateIndex
CREATE INDEX "ClaimEvidence_claimId_relationship_idx" ON "ClaimEvidence"("claimId", "relationship");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimEvidence_claimId_evidenceId_key" ON "ClaimEvidence"("claimId", "evidenceId");

-- CreateIndex
CREATE INDEX "ResearchReport_runId_createdAt_idx" ON "ResearchReport"("runId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchReport_runId_version_key" ON "ResearchReport"("runId", "version");

-- CreateIndex
CREATE INDEX "ReportCitation_evidenceId_idx" ON "ReportCitation"("evidenceId");

-- CreateIndex
CREATE INDEX "ReportCitation_reportId_idx" ON "ReportCitation"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCitation_reportId_citationNumber_key" ON "ReportCitation"("reportId", "citationNumber");

-- CreateIndex
CREATE INDEX "ReportExport_reportId_createdAt_idx" ON "ReportExport"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "ReportExport_status_idx" ON "ReportExport"("status");

-- CreateIndex
CREATE INDEX "ResearchMemory_scope_type_idx" ON "ResearchMemory"("scope", "type");

-- CreateIndex
CREATE INDEX "ResearchMemory_workspaceId_type_idx" ON "ResearchMemory"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "ResearchMemory_projectId_type_idx" ON "ResearchMemory"("projectId", "type");

-- CreateIndex
CREATE INDEX "ResearchMemory_userId_type_idx" ON "ResearchMemory"("userId", "type");

-- CreateIndex
CREATE INDEX "ResearchMemory_expiresAt_idx" ON "ResearchMemory"("expiresAt");

-- CreateIndex
CREATE INDEX "ResearchMemorySource_snapshotId_idx" ON "ResearchMemorySource"("snapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchMemorySource_memoryId_snapshotId_key" ON "ResearchMemorySource"("memoryId", "snapshotId");

-- CreateIndex
CREATE INDEX "MCPServer_workspaceId_isEnabled_idx" ON "MCPServer"("workspaceId", "isEnabled");

-- CreateIndex
CREATE INDEX "MCPServer_status_idx" ON "MCPServer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MCPServer_workspaceId_name_key" ON "MCPServer"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "MCPTool_serverId_isEnabled_idx" ON "MCPTool"("serverId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "MCPTool_serverId_name_key" ON "MCPTool"("serverId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MCPToolCall_idempotencyKey_key" ON "MCPToolCall"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MCPToolCall_runId_createdAt_idx" ON "MCPToolCall"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "MCPToolCall_serverId_status_idx" ON "MCPToolCall"("serverId", "status");

-- CreateIndex
CREATE INDEX "MCPToolCall_toolId_idx" ON "MCPToolCall"("toolId");

-- CreateIndex
CREATE INDEX "MCPToolPermission_serverId_toolId_idx" ON "MCPToolPermission"("serverId", "toolId");

-- CreateIndex
CREATE INDEX "MCPToolPermission_userId_idx" ON "MCPToolPermission"("userId");

-- CreateIndex
CREATE INDEX "MCPToolPermission_workspaceRole_idx" ON "MCPToolPermission"("workspaceRole");

-- CreateIndex
CREATE UNIQUE INDEX "MCPApprovalRequest_toolCallId_key" ON "MCPApprovalRequest"("toolCallId");

-- CreateIndex
CREATE INDEX "MCPApprovalRequest_status_requestedAt_idx" ON "MCPApprovalRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "ExternalConnection_userId_provider_idx" ON "ExternalConnection"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalConnection_userId_provider_externalAccountId_key" ON "ExternalConnection"("userId", "provider", "externalAccountId");

-- CreateIndex
CREATE INDEX "LLMInvocation_runId_createdAt_idx" ON "LLMInvocation"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "LLMInvocation_provider_modelName_idx" ON "LLMInvocation"("provider", "modelName");

-- CreateIndex
CREATE INDEX "DocumentAsset_workspaceId_createdAt_idx" ON "DocumentAsset"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAsset_projectId_idx" ON "DocumentAsset"("projectId");

-- CreateIndex
CREATE INDEX "DocumentAsset_runId_idx" ON "DocumentAsset"("runId");

-- CreateIndex
CREATE INDEX "DocumentAsset_status_idx" ON "DocumentAsset"("status");

-- CreateIndex
CREATE INDEX "KnowledgeNode_workspaceId_type_idx" ON "KnowledgeNode"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "KnowledgeNode_name_idx" ON "KnowledgeNode"("name");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_sourceNodeId_idx" ON "KnowledgeEdge"("sourceNodeId");

-- CreateIndex
CREATE INDEX "KnowledgeEdge_targetNodeId_idx" ON "KnowledgeEdge"("targetNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeEdge_sourceNodeId_targetNodeId_relationship_key" ON "KnowledgeEdge"("sourceNodeId", "targetNodeId", "relationship");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRun" ADD CONSTRAINT "ResearchRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRun" ADD CONSTRAINT "ResearchRun_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchPlan" ADD CONSTRAINT "ResearchPlan_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchPlan" ADD CONSTRAINT "ResearchPlan_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchTask" ADD CONSTRAINT "ResearchTask_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchTask" ADD CONSTRAINT "ResearchTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ResearchPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchTask" ADD CONSTRAINT "ResearchTask_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "ResearchTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchTaskDependency" ADD CONSTRAINT "ResearchTaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ResearchTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchTaskDependency" ADD CONSTRAINT "ResearchTaskDependency_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "ResearchTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ResearchTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_parentExecutionId_fkey" FOREIGN KEY ("parentExecutionId") REFERENCES "AgentExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchEvent" ADD CONSTRAINT "ResearchEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchEvent" ADD CONSTRAINT "ResearchEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ResearchTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchEvent" ADD CONSTRAINT "ResearchEvent_agentExecutionId_fkey" FOREIGN KEY ("agentExecutionId") REFERENCES "AgentExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSource" ADD CONSTRAINT "ResearchSource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceSnapshot" ADD CONSTRAINT "SourceSnapshot_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRunSource" ADD CONSTRAINT "ResearchRunSource_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRunSource" ADD CONSTRAINT "ResearchRunSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchRunSource" ADD CONSTRAINT "ResearchRunSource_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceChunk" ADD CONSTRAINT "SourceChunk_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchClaim" ADD CONSTRAINT "ResearchClaim_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEvidence" ADD CONSTRAINT "ClaimEvidence_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ResearchClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimEvidence" ADD CONSTRAINT "ClaimEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchReport" ADD CONSTRAINT "ResearchReport_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCitation" ADD CONSTRAINT "ReportCitation_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ResearchClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCitation" ADD CONSTRAINT "ReportCitation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ResearchReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCitation" ADD CONSTRAINT "ReportCitation_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ResearchReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchMemory" ADD CONSTRAINT "ResearchMemory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchMemory" ADD CONSTRAINT "ResearchMemory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchMemory" ADD CONSTRAINT "ResearchMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchMemory" ADD CONSTRAINT "ResearchMemory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchMemory" ADD CONSTRAINT "ResearchMemory_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "ResearchRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchMemorySource" ADD CONSTRAINT "ResearchMemorySource_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "ResearchMemory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchMemorySource" ADD CONSTRAINT "ResearchMemorySource_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPServer" ADD CONSTRAINT "MCPServer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPServer" ADD CONSTRAINT "MCPServer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPTool" ADD CONSTRAINT "MCPTool_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MCPServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPToolCall" ADD CONSTRAINT "MCPToolCall_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPToolCall" ADD CONSTRAINT "MCPToolCall_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MCPServer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPToolCall" ADD CONSTRAINT "MCPToolCall_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "MCPTool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPToolPermission" ADD CONSTRAINT "MCPToolPermission_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "MCPServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPToolPermission" ADD CONSTRAINT "MCPToolPermission_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "MCPTool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPToolPermission" ADD CONSTRAINT "MCPToolPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPApprovalRequest" ADD CONSTRAINT "MCPApprovalRequest_toolCallId_fkey" FOREIGN KEY ("toolCallId") REFERENCES "MCPToolCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPApprovalRequest" ADD CONSTRAINT "MCPApprovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCPApprovalRequest" ADD CONSTRAINT "MCPApprovalRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalConnection" ADD CONSTRAINT "ExternalConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LLMInvocation" ADD CONSTRAINT "LLMInvocation_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LLMInvocation" ADD CONSTRAINT "LLMInvocation_agentExecutionId_fkey" FOREIGN KEY ("agentExecutionId") REFERENCES "AgentExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAsset" ADD CONSTRAINT "DocumentAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAsset" ADD CONSTRAINT "DocumentAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAsset" ADD CONSTRAINT "DocumentAsset_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAsset" ADD CONSTRAINT "DocumentAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEdge" ADD CONSTRAINT "KnowledgeEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEdge" ADD CONSTRAINT "KnowledgeEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ======================================================
-- PGVECTOR HNSW COSINE INDEXES
-- ======================================================
CREATE INDEX IF NOT EXISTS "SourceChunk_embedding_hnsw_idx" ON "SourceChunk" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "ResearchMemory_embedding_hnsw_idx" ON "ResearchMemory" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "KnowledgeNode_embedding_hnsw_idx" ON "KnowledgeNode" USING hnsw ("embedding" vector_cosine_ops);

-- ======================================================
-- LANGGRAPH POSTGRES CHECKPOINT TABLES
-- ======================================================
CREATE TABLE IF NOT EXISTS "checkpoint_migrations" (
    v INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "checkpoints" (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    parent_checkpoint_id TEXT,
    type TEXT,
    checkpoint JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE TABLE IF NOT EXISTS "checkpoint_blobs" (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    channel TEXT NOT NULL,
    version TEXT NOT NULL,
    type TEXT NOT NULL,
    blob BYTEA,
    PRIMARY KEY (thread_id, checkpoint_ns, channel, version)
);

CREATE TABLE IF NOT EXISTS "checkpoint_writes" (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    channel TEXT NOT NULL,
    type TEXT,
    blob BYTEA NOT NULL,
    task_path TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

CREATE INDEX IF NOT EXISTS "checkpoints_thread_id_idx" ON "checkpoints"(thread_id);
CREATE INDEX IF NOT EXISTS "checkpoint_blobs_thread_id_idx" ON "checkpoint_blobs"(thread_id);
CREATE INDEX IF NOT EXISTS "checkpoint_writes_thread_id_idx" ON "checkpoint_writes"(thread_id);

INSERT INTO "checkpoint_migrations" (v) VALUES (0), (1), (2), (3), (4), (5), (6), (7), (8), (9) ON CONFLICT (v) DO NOTHING;

