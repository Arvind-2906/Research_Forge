import { prisma } from "./prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { getPaginationParams, formatPaginatedResponse } from "../utils/pagination.js";
import { AIEngineClient } from "./aiEngineClient.js";
import { logger } from "../utils/logger.js";

export class ResearchService {
  /**
   * Validates user has access to the workspace owning the run
   */
  static async validateRunAccess(runId, userId) {
    const run = await prisma.researchRun.findUnique({
      where: { id: runId },
      include: {
        project: {
          include: {
            workspace: {
              include: {
                members: { where: { userId } },
              },
            },
          },
        },
      },
    });

    if (!run) {
      throw new AppError("Research run not found", 404, "RUN_NOT_FOUND");
    }

    const ws = run.project.workspace;
    const isOwner = ws.ownerId === userId;
    const isMember = ws.members.length > 0;

    if (!isOwner && !isMember) {
      throw new AppError("Access denied to this research run", 403, "RUN_FORBIDDEN");
    }

    return { run, workspace: ws };
  }

  /**
   * Creates a new research run
   */
  static async createRun(userId, data) {
    // Validate project access
    const project = await prisma.researchProject.findUnique({
      where: { id: data.projectId },
      include: {
        workspace: {
          include: { members: { where: { userId } } },
        },
      },
    });

    if (!project) {
      throw new AppError("Project not found", 404, "PROJECT_NOT_FOUND");
    }

    const ws = project.workspace;
    if (ws.ownerId !== userId && ws.members.length === 0) {
      throw new AppError("Access denied to create runs in this project", 403, "PROJECT_FORBIDDEN");
    }

    const run = await prisma.$transaction(async (tx) => {
      const created = await tx.researchRun.create({
        data: {
          projectId: data.projectId,
          question: data.question,
          status: "QUEUED",
          configuration: data.configuration || {},
          requestedById: userId,
        },
        include: {
          requestedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Create initial audit event
      await tx.researchEvent.create({
        data: {
          runId: created.id,
          sequence: 1,
          eventType: "run.created",
          message: `Research run created for question: "${data.question}"`,
          payload: { question: data.question, configuration: data.configuration },
        },
      });

      return created;
    });

    return run;
  }

  /**
   * Lists research runs with pagination and filtering
   */
  static async listRuns(userId, query) {
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(query);

    const where = {
      project: {
        workspace: {
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
      },
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, runs] = await Promise.all([
      prisma.researchRun.count({ where }),
      prisma.researchRun.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          project: {
            select: { id: true, title: true, workspaceId: true },
          },
          requestedBy: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              plans: true,
              tasks: true,
              events: true,
              reports: true,
            },
          },
        },
      }),
    ]);

    return formatPaginatedResponse(runs, total, page, limit);
  }

  /**
   * Retrieves full run details
   */
  static async getRunById(runId, userId) {
    await this.validateRunAccess(runId, userId);

    const run = await prisma.researchRun.findUnique({
      where: { id: runId },
      include: {
        project: {
          select: { id: true, title: true, workspaceId: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        plans: {
          orderBy: { version: "desc" },
          take: 1,
        },
        _count: {
          select: {
            tasks: true,
            executions: true,
            events: true,
            runSources: true,
            claims: true,
            reports: true,
          },
        },
      },
    });

    return run;
  }

  /**
   * Starts or triggers execution of a run (idempotent)
   */
  static async startRun(runId, userId) {
    const { run } = await this.validateRunAccess(runId, userId);

    // Idempotency check: if already active, return current status
    if (run.status === "PLANNING" || run.status === "RUNNING") {
      return { run, message: "Research run is already in progress" };
    }

    if (run.status === "COMPLETED") {
      throw new AppError("Cannot start a run that has already completed", 400, "ALREADY_COMPLETED");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.researchRun.update({
        where: { id: runId },
        data: {
          status: "PLANNING",
          startedAt: run.startedAt || new Date(),
          errorCode: null,
          errorMessage: null,
        },
      });

      const lastEvent = await tx.researchEvent.findFirst({
        where: { runId },
        orderBy: { sequence: "desc" },
      });

      await tx.researchEvent.create({
        data: {
          runId,
          sequence: (lastEvent?.sequence || 0) + 1,
          eventType: "run.started",
          message: "Research execution started.",
        },
      });

      return r;
    });

    // Notify Python AI Engine asynchronously
    AIEngineClient.post("/api/v1/research/execute", {
      run_id: runId,
      user_id: userId,
      question: run.question,
      configuration: run.configuration,
    }).catch((err) => {
      logger.warn(`[AI Engine] Notification for run ${runId} deferred/queued: ${err.message}`);
    });

    return { run: updated, message: "Research run execution initiated" };
  }

  /**
   * Pauses an active run
   */
  static async pauseRun(runId, userId) {
    await this.validateRunAccess(runId, userId);

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.researchRun.update({
        where: { id: runId },
        data: {
          status: "PAUSED",
          pausedAt: new Date(),
        },
      });

      const lastEvent = await tx.researchEvent.findFirst({
        where: { runId },
        orderBy: { sequence: "desc" },
      });

      await tx.researchEvent.create({
        data: {
          runId,
          sequence: (lastEvent?.sequence || 0) + 1,
          eventType: "run.paused",
          message: "Research execution paused by user.",
        },
      });

      return r;
    });

    AIEngineClient.post(`/api/v1/research/${runId}/pause`).catch((err) => {
      logger.warn(`[AI Engine] Pause call for run ${runId} deferred: ${err.message}`);
    });

    return updated;
  }

  /**
   * Resumes a paused run
   */
  static async resumeRun(runId, userId) {
    await this.validateRunAccess(runId, userId);

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.researchRun.update({
        where: { id: runId },
        data: {
          status: "RUNNING",
          pausedAt: null,
        },
      });

      const lastEvent = await tx.researchEvent.findFirst({
        where: { runId },
        orderBy: { sequence: "desc" },
      });

      await tx.researchEvent.create({
        data: {
          runId,
          sequence: (lastEvent?.sequence || 0) + 1,
          eventType: "run.resumed",
          message: "Research execution resumed.",
        },
      });

      return r;
    });

    AIEngineClient.post(`/api/v1/research/${runId}/resume`).catch((err) => {
      logger.warn(`[AI Engine] Resume call for run ${runId} deferred: ${err.message}`);
    });

    return updated;
  }

  /**
   * Cancels a research run
   */
  static async cancelRun(runId, userId) {
    await this.validateRunAccess(runId, userId);

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.researchRun.update({
        where: { id: runId },
        data: {
          status: "CANCELLED",
          completedAt: new Date(),
        },
      });

      const lastEvent = await tx.researchEvent.findFirst({
        where: { runId },
        orderBy: { sequence: "desc" },
      });

      await tx.researchEvent.create({
        data: {
          runId,
          sequence: (lastEvent?.sequence || 0) + 1,
          eventType: "run.cancelled",
          message: "Research execution cancelled by user.",
        },
      });

      return r;
    });

    AIEngineClient.post(`/api/v1/research/${runId}/cancel`).catch((err) => {
      logger.warn(`[AI Engine] Cancel call for run ${runId} deferred: ${err.message}`);
    });

    return updated;
  }

  /**
   * Retries a failed or cancelled run
   */
  static async retryRun(runId, userId) {
    await this.validateRunAccess(runId, userId);

    const updated = await prisma.researchRun.update({
      where: { id: runId },
      data: {
        status: "QUEUED",
        errorCode: null,
        errorMessage: null,
        completedAt: null,
      },
    });

    return this.startRun(runId, userId);
  }

  /**
   * Retrieves ordered research events
   */
  static async getRunEvents(runId, userId, query) {
    await this.validateRunAccess(runId, userId);
    const { page, limit, skip } = getPaginationParams(query);

    const where = {
      runId,
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
    };

    const total = await prisma.researchEvent.count({ where });
    const events = await prisma.researchEvent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sequence: "asc" },
    });

    return formatPaginatedResponse(events, total, page, limit);
  }

  /**
   * Retrieves tasks and dependencies for a run
   */
  static async getRunTasks(runId, userId) {
    await this.validateRunAccess(runId, userId);

    return prisma.researchTask.findMany({
      where: { runId },
      include: {
        dependencies: {
          include: {
            dependsOn: { select: { id: true, title: true, status: true } },
          },
        },
        dependents: {
          include: {
            task: { select: { id: true, title: true, status: true } },
          },
        },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });
  }

  /**
   * Retrieves agent execution records for a run
   */
  static async getRunAgents(runId, userId) {
    await this.validateRunAccess(runId, userId);

    return prisma.agentExecution.findMany({
      where: { runId },
      orderBy: { sequence: "asc" },
    });
  }

  /**
   * Retrieves sources discovered or extracted for a run
   */
  static async getRunSources(runId, userId) {
    await this.validateRunAccess(runId, userId);

    return prisma.researchRunSource.findMany({
      where: { runId },
      include: {
        source: {
          include: {
            snapshots: { take: 1, orderBy: { capturedAt: "desc" } },
            _count: { select: { chunks: true, claims: true } },
          },
        },
      },
      orderBy: { discoveredAt: "desc" },
    });
  }

  /**
   * Retrieves extracted claims and linked evidence for a run
   */
  static async getRunEvidence(runId, userId) {
    await this.validateRunAccess(runId, userId);

    return prisma.researchClaim.findMany({
      where: { runId },
      include: {
        source: { select: { id: true, title: true, url: true } },
        evidenceLinks: {
          include: {
            evidence: {
              include: {
                snapshot: {
                  include: { source: { select: { id: true, title: true, url: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Retrieves the final report and citations for a run
   */
  static async getRunReport(runId, userId) {
    await this.validateRunAccess(runId, userId);

    const report = await prisma.researchReport.findFirst({
      where: { runId },
      orderBy: { version: "desc" },
      include: {
        citations: {
          include: {
            evidence: {
              select: { id: true, supportingQuote: true, confidence: true },
            },
            claim: {
              select: { id: true, claim: true, status: true },
            },
          },
          orderBy: { citationNumber: "asc" },
        },
        exports: true,
      },
    });

    if (!report) {
      throw new AppError("No report has been generated for this run yet", 404, "REPORT_NOT_FOUND");
    }

    return report;
  }
}
