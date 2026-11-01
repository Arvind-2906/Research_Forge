import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { prisma } from "../src/services/prisma.js";
import { WorkspaceService } from "../src/services/workspaceService.js";
import { ProjectService } from "../src/services/projectService.js";
import { ResearchService } from "../src/services/researchService.js";
import { PlanService } from "../src/services/planService.js";
import { ReportService } from "../src/services/reportService.js";
import { DocumentService } from "../src/services/documentService.js";

test("Phase 3 - Workspace CRUD and Membership Workflow", async () => {
  // Setup test user
  const user = await prisma.user.create({
    data: { name: "WS Test User", email: `ws-test-${Date.now()}@example.com` },
  });
  const collaborator = await prisma.user.create({
    data: { name: "Collab User", email: `collab-${Date.now()}@example.com` },
  });

  try {
    // 1. Create Workspace
    const workspace = await WorkspaceService.createWorkspace(user.id, {
      name: "Engineering Research Space",
      description: "Dedicated to AI research",
    });
    assert.ok(workspace.id);
    assert.equal(workspace.name, "Engineering Research Space");
    assert.equal(workspace.ownerId, user.id);

    // 2. List Workspaces
    const list = await WorkspaceService.listWorkspaces(user.id);
    assert.ok(list.some((w) => w.id === workspace.id));

    // 3. Update Workspace
    const updated = await WorkspaceService.updateWorkspace(workspace.id, user.id, {
      name: "Autonomous Research Lab",
    });
    assert.equal(updated.name, "Autonomous Research Lab");

    // 4. Add Member
    const member = await WorkspaceService.addMember(workspace.id, user.id, {
      userId: collaborator.id,
      role: "MEMBER",
    });
    assert.equal(member.role, "MEMBER");
    assert.equal(member.userId, collaborator.id);

    // 5. Update Member Role
    const promoted = await WorkspaceService.updateMemberRole(workspace.id, member.id, "ADMIN");
    assert.equal(promoted.role, "ADMIN");

    // 6. List Members
    const members = await WorkspaceService.listMembers(workspace.id);
    assert.equal(members.length, 2);

    // 7. Remove Member
    const removeRes = await WorkspaceService.removeMember(workspace.id, member.id);
    assert.equal(removeRes.success, true);

    // 8. Delete Workspace
    const delRes = await WorkspaceService.deleteWorkspace(workspace.id, user.id);
    assert.equal(delRes.success, true);
  } finally {
    await prisma.user.deleteMany({
      where: { id: { in: [user.id, collaborator.id] } },
    });
  }
});

test("Phase 3 - Research Project CRUD and Pagination", async () => {
  const user = await prisma.user.create({
    data: { name: "Project Test User", email: `proj-test-${Date.now()}@example.com` },
  });

  const workspace = await WorkspaceService.createWorkspace(user.id, {
    name: "Project Test WS",
  });

  try {
    // 1. Create Project
    const project = await ProjectService.createProject(user.id, {
      workspaceId: workspace.id,
      title: "Quantum LLM Reasoning",
      description: "Investigating reasoning limits",
    });
    assert.ok(project.id);
    assert.equal(project.title, "Quantum LLM Reasoning");

    // 2. List Projects (Paginated)
    const paginated = await ProjectService.listProjects(workspace.id, user.id, {
      page: 1,
      limit: 10,
      search: "Quantum",
    });
    assert.equal(paginated.pagination.total, 1);
    assert.equal(paginated.items[0].id, project.id);

    // 3. Update Project
    const updated = await ProjectService.updateProject(project.id, user.id, {
      title: "Quantum AI Reasoning v2",
      status: "ACTIVE",
    });
    assert.equal(updated.title, "Quantum AI Reasoning v2");

    // 4. Get Project Details
    const details = await ProjectService.getProjectById(project.id, user.id);
    assert.equal(details.id, project.id);
    assert.equal(details.title, "Quantum AI Reasoning v2");

    // 5. Delete Project
    const delRes = await ProjectService.deleteProject(project.id, user.id);
    assert.equal(delRes.success, true);
  } finally {
    await prisma.workspace.delete({ where: { id: workspace.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("Phase 3 - Research Run Lifecycle, Planning, and Human Approval Workflow", async () => {
  const user = await prisma.user.create({
    data: { name: "Run Test User", email: `run-test-${Date.now()}@example.com` },
  });

  const workspace = await WorkspaceService.createWorkspace(user.id, {
    name: "Run Lifecycle WS",
  });

  const project = await ProjectService.createProject(user.id, {
    workspaceId: workspace.id,
    title: "Agentic Workflows",
  });

  try {
    // 1. Create Run
    const run = await ResearchService.createRun(user.id, {
      projectId: project.id,
      question: "What are the latest breakthroughs in agentic research workflows?",
      configuration: { researchDepth: "deep", searchEngines: ["tavily", "exa"] },
    });
    assert.ok(run.id);
    assert.equal(run.status, "QUEUED");

    // Verify initial event was recorded
    const initialEvents = await ResearchService.getRunEvents(run.id, user.id, {});
    assert.equal(initialEvents.pagination.total, 1);
    assert.equal(initialEvents.items[0].eventType, "run.created");

    // 2. Start Run (transition to PLANNING)
    const startResult = await ResearchService.startRun(run.id, user.id);
    assert.equal(startResult.run.status, "PLANNING");

    // 3. Create a Research Plan (Draft) with Tasks
    const plan = await prisma.researchPlan.create({
      data: {
        runId: run.id,
        version: 1,
        objective: "Synthesize latest findings on agentic workflows",
        content: { steps: ["Discover sources", "Verify claims"] },
        status: "DRAFT",
      },
    });

    const task = await prisma.researchTask.create({
      data: {
        runId: run.id,
        planId: plan.id,
        title: "Tavily search for 2026 agentic papers",
        assignedAgent: "Web Research Agent",
        status: "PENDING",
      },
    });
    assert.ok(task.id);

    // 4. Update Run to WAITING_FOR_APPROVAL
    await prisma.researchRun.update({
      where: { id: run.id },
      data: { status: "WAITING_FOR_APPROVAL" },
    });

    // 5. Human Approval Workflow
    const approvedPlan = await PlanService.approvePlan(plan.id, user.id);
    assert.equal(approvedPlan.status, "APPROVED");
    assert.equal(approvedPlan.approvedById, user.id);

    // Verify run transitioned to RUNNING
    const runningRun = await ResearchService.getRunById(run.id, user.id);
    assert.equal(runningRun.status, "RUNNING");

    // 6. Pause & Resume Run
    const pausedRun = await ResearchService.pauseRun(run.id, user.id);
    assert.equal(pausedRun.status, "PAUSED");

    const resumedRun = await ResearchService.resumeRun(run.id, user.id);
    assert.equal(resumedRun.status, "RUNNING");

    // 7. Tasks and Events Inspection
    const tasks = await ResearchService.getRunTasks(run.id, user.id);
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].title, "Tavily search for 2026 agentic papers");

    const events = await ResearchService.getRunEvents(run.id, user.id, {});
    assert.ok(events.pagination.total >= 4);

    // 8. Cancel Run
    const cancelled = await ResearchService.cancelRun(run.id, user.id);
    assert.equal(cancelled.status, "CANCELLED");
  } finally {
    await prisma.workspace.delete({ where: { id: workspace.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("Phase 3 - Report Generation, Citations, and Document Assets", async () => {
  const user = await prisma.user.create({
    data: { name: "Report User", email: `report-${Date.now()}@example.com` },
  });

  const workspace = await WorkspaceService.createWorkspace(user.id, {
    name: "Report WS",
  });

  const project = await ProjectService.createProject(user.id, {
    workspaceId: workspace.id,
    title: "Report Project",
  });

  const run = await ResearchService.createRun(user.id, {
    projectId: project.id,
    question: "How do vector databases scale with pgvector?",
  });

  try {
    // 1. Create Report with Citation
    const report = await prisma.researchReport.create({
      data: {
        runId: run.id,
        version: 1,
        title: "Scaling with pgvector in 2026",
        executiveSummary: "pgvector HNSW index provides 10x query throughput.",
        contentMarkdown: "# Report\npgvector enables cosine similarity [1].",
        status: "COMPLETED",
      },
    });

    const citation = await prisma.reportCitation.create({
      data: {
        reportId: report.id,
        citationNumber: 1,
        citationText: "Neon pgvector architecture whitepaper",
        locator: "Section 3.2",
      },
    });
    assert.ok(citation.id);

    // 2. Retrieve Report via Service
    const retrieved = await ReportService.getReportById(report.id, user.id);
    assert.equal(retrieved.id, report.id);
    assert.equal(retrieved.citations.length, 1);
    assert.equal(retrieved.citations[0].citationNumber, 1);

    // 3. Export Report
    const exportRecord = await ReportService.createExport(report.id, user.id, "PDF");
    assert.equal(exportRecord.format, "PDF");
    assert.equal(exportRecord.status, "PENDING");

    // 4. Create Document Asset
    const doc = await DocumentService.createDocument(user.id, {
      workspaceId: workspace.id,
      projectId: project.id,
      fileName: "research_notes.pdf",
      originalName: "Original_Notes.pdf",
      mimeType: "application/pdf",
      fileSize: 1048576,
      storageKey: `workspaces/${workspace.id}/docs/research_notes.pdf`,
      metadata: { pageCount: 12 },
    });
    assert.ok(doc.id);
    assert.equal(doc.fileName, "research_notes.pdf");
    assert.equal(doc.fileSize, 1048576);

    // 5. List Documents
    const docList = await DocumentService.listDocuments(user.id, {
      workspaceId: workspace.id,
    });
    assert.equal(docList.pagination.total, 1);
    assert.equal(docList.items[0].id, doc.id);

    // 6. Process Document Status
    const processed = await DocumentService.processDocument(doc.id, user.id);
    assert.equal(processed.status, "PROCESSING");

    const statusCheck = await DocumentService.getDocumentStatus(doc.id, user.id);
    assert.equal(statusCheck.status, "PROCESSING");

    // 7. Cleanup Document
    await DocumentService.deleteDocument(doc.id, user.id);
  } finally {
    await prisma.workspace.delete({ where: { id: workspace.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});

