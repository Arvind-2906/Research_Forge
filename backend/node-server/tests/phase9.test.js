import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/services/prisma.js";
import { WorkspaceService } from "../src/services/workspaceService.js";
import { ProjectService } from "../src/services/projectService.js";
import { ResearchService } from "../src/services/researchService.js";
import { ReportService } from "../src/services/reportService.js";
import { KnowledgeGraphService } from "../src/services/knowledgeGraphService.js";
import { AnalyticsService } from "../src/services/analyticsService.js";

test("Phase 9 - Reports, Knowledge Graph, and Analytics Integration", async () => {
  const timestamp = Date.now();

  // 1. Setup Test Users
  const userA = await prisma.user.create({
    data: { name: "User A P9", email: `user-a-p9-${timestamp}@example.com` },
  });
  const userB = await prisma.user.create({
    data: { name: "User B P9", email: `user-b-p9-${timestamp}@example.com` },
  });

  // 2. Setup Workspace & Project
  const workspace = await WorkspaceService.createWorkspace(userA.id, {
    name: "Phase 9 Analytics Workspace",
  });
  const project = await ProjectService.createProject(userA.id, {
    workspaceId: workspace.id,
    title: "Quantum Materials Research",
    description: "Investigation of room-temperature superconductors",
  });

  // 3. Setup Research Run & Report
  const run = await ResearchService.createRun(userA.id, {
    projectId: project.id,
    question: "What are the latest developments in LK-99 and related cuprates?",
    mode: "DEEP",
  });

  const report = await prisma.researchReport.create({
    data: {
      title: "Cuprates and High-Tc Superconductors Report",
      executiveSummary: "Independent replications demonstrate diamagnetism without zero resistance.",
      contentMarkdown: "Initial claims of room temperature superconductivity [1] have been refuted by multiple labs [2].",
      status: "COMPLETED",
      runId: run.id,
    },
  });

  try {
    // ==========================================
    // A. Citation Management & Auditing
    // ==========================================

    // 1. Add Citations
    const cit1 = await ReportService.addCitation(report.id, userA.id, {
      citationNumber: 1,
      citationText: "Original preprint claiming Tc > 400K",
      locator: "arXiv:2307.12008",
    });
    assert.ok(cit1.id);
    assert.equal(cit1.citationNumber, 1);

    const cit2 = await ReportService.addCitation(report.id, userA.id, {
      citationNumber: 2,
      citationText: "Max Planck Institute ferromagnetism verification",
      locator: "Nature 620, 708 (2023)",
    });
    assert.ok(cit2.id);
    assert.equal(cit2.citationNumber, 2);

    // 2. Retrieve Citations
    const citations = await ReportService.getReportCitations(report.id, userA.id);
    assert.equal(citations.length, 2);

    // 3. User B cannot access Report citations (403 forbidden)
    await assert.rejects(
      async () => {
        await ReportService.getReportCitations(report.id, userB.id);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "REPORT_FORBIDDEN");
        return true;
      }
    );

    // 4. Citation Validation
    const audit = await ReportService.validateCitations(report.id, userA.id);
    assert.ok(audit);
    assert.equal(audit.valid, true);
    assert.equal(audit.total_cited_in_text, 2);
    assert.equal(audit.total_registered_citations, 2);

    // 5. Delete a citation
    const deleteCitRes = await ReportService.deleteCitation(report.id, cit2.id, userA.id);
    assert.equal(deleteCitRes.success, true);
    const updatedCitations = await ReportService.getReportCitations(report.id, userA.id);
    assert.equal(updatedCitations.length, 1);

    // ==========================================
    // B. Report Exports
    // ==========================================

    const exportMarkdown = await ReportService.createExport(report.id, userA.id, "MARKDOWN");
    assert.ok(exportMarkdown.id);
    assert.equal(exportMarkdown.format, "MARKDOWN");

    const exportPdf = await ReportService.createExport(report.id, userA.id, "PDF");
    assert.ok(exportPdf.id);
    assert.equal(exportPdf.format, "PDF");

    const exportList = await ReportService.getReportExports(report.id, userA.id);
    assert.ok(exportList.length >= 2);

    // ==========================================
    // C. Knowledge Graph Management
    // ==========================================

    // 1. Create Nodes
    const nodeA = await KnowledgeGraphService.createNode(userA.id, {
      workspaceId: workspace.id,
      name: "Cuprate Superconductors",
      type: "CONCEPT",
      description: "Class of high-temperature superconducting materials containing copper oxide layers.",
    });
    assert.ok(nodeA.id);
    assert.equal(nodeA.name, "Cuprate Superconductors");

    const nodeB = await KnowledgeGraphService.createNode(userA.id, {
      workspaceId: workspace.id,
      name: "Meissner Effect",
      type: "CONCEPT",
      description: "Expulsion of a magnetic field from a superconductor during transition.",
    });
    assert.ok(nodeB.id);

    // 2. User B cannot access workspace nodes
    await assert.rejects(
      async () => {
        await KnowledgeGraphService.getNodeById(userB.id, nodeA.id);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "WORKSPACE_FORBIDDEN");
        return true;
      }
    );

    // 3. Create Edge
    const edge = await KnowledgeGraphService.createEdge(userA.id, {
      sourceNodeId: nodeA.id,
      targetNodeId: nodeB.id,
      relationship: "SUPPORTS",
      description: "Cuprates exhibit full magnetic flux expulsion below critical temperature.",
      weight: 0.98,
    });
    assert.ok(edge.id);
    assert.equal(edge.relationship, "SUPPORTS");

    // 4. Neighborhood Query
    const neighborhood = await KnowledgeGraphService.getNeighborhood(userA.id, nodeA.id);
    assert.ok(neighborhood.center);
    assert.equal(neighborhood.center.id, nodeA.id);
    assert.ok(neighborhood.nodes.length >= 2);
    assert.ok(neighborhood.edges.length >= 1);

    // 5. Update Node
    const updatedNode = await KnowledgeGraphService.updateNode(userA.id, nodeA.id, {
      description: "Updated description for cuprates.",
    });
    assert.equal(updatedNode.description, "Updated description for cuprates.");

    // 6. Search Graph
    const searchResults = await KnowledgeGraphService.searchGraph(userA.id, {
      workspaceId: workspace.id,
      query: "magnetic field expulsion",
    });
    assert.ok(Array.isArray(searchResults));

    // ==========================================
    // D. Analytics Subsystem
    // ==========================================

    // Seed test telemetry: LLM invocation, Agent execution, MCP tool call
    await prisma.lLMInvocation.create({
      data: {
        provider: "GROQ",
        modelName: "llama-3.3-70b-versatile",
        operation: "RESEARCH_SYNTHESIS",
        promptTokens: 1200,
        completionTokens: 450,
        totalTokens: 1650,
        estimatedCost: 0.0012,
        durationMs: 850,
        status: "COMPLETED",
        runId: run.id,
      },
    });

    await prisma.agentExecution.create({
      data: {
        agentName: "synthesizer",
        status: "COMPLETED",
        sequence: 1,
        durationMs: 900,
        promptTokens: 1200,
        completionTokens: 450,
        runId: run.id,
      },
    });

    await prisma.mCPToolCall.create({
      data: {
        toolName: "arxiv_search",
        status: "SUCCESS",
        durationMs: 320,
        runId: run.id,
      },
    });

    // 1. Overview Analytics
    const overview = await AnalyticsService.getOverview(workspace.id, userA.id);
    assert.ok(overview);
    assert.ok(overview.totalProjects >= 1);
    assert.ok(overview.totalRuns >= 1);
    assert.ok(overview.totalReports >= 1);
    assert.ok(overview.tokens.totalTokens >= 1650);

    // 2. Usage Analytics
    const usage = await AnalyticsService.getUsage(workspace.id, userA.id);
    assert.ok(usage.summary);
    assert.ok(usage.summary.totalTokens >= 1650);
    assert.ok(usage.recent.length >= 1);

    // 3. Runs Analytics
    const runsAnalytics = await AnalyticsService.getRunsAnalytics(workspace.id, userA.id);
    assert.ok(runsAnalytics);
    assert.ok(runsAnalytics.totalRuns >= 1);

    // 4. Agent Execution Analytics
    const agentsAnalytics = await AnalyticsService.getAgentsAnalytics(workspace.id, userA.id);
    assert.ok(agentsAnalytics.totalExecutions >= 1);
    assert.ok(agentsAnalytics.agents.some((a) => a.agentName === "synthesizer"));

    // 5. Model Analytics
    const modelsAnalytics = await AnalyticsService.getModelsAnalytics(workspace.id, userA.id);
    assert.ok(modelsAnalytics.totalInvocations >= 1);
    assert.ok(modelsAnalytics.models.some((m) => m.modelName === "llama-3.3-70b-versatile"));

    // 6. MCP Analytics
    const mcpAnalytics = await AnalyticsService.getMcpAnalytics(workspace.id, userA.id);
    assert.ok(mcpAnalytics.totalCalls >= 1);
    assert.ok(mcpAnalytics.tools.some((t) => t.toolName === "arxiv_search"));

    // 7. User B cannot access analytics for User A's workspace
    await assert.rejects(
      async () => {
        await AnalyticsService.getOverview(workspace.id, userB.id);
      },
      (err) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, "WORKSPACE_FORBIDDEN");
        return true;
      }
    );
  } finally {
    // Clean up
    try {
      await prisma.workspace.delete({ where: { id: workspace.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: userB.id } }).catch(() => {});
    } catch (_) {}
  }
});
