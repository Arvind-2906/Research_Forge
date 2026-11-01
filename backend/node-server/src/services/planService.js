import { prisma } from "./prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { AIEngineClient } from "./aiEngineClient.js";
import { logger } from "../utils/logger.js";

export class PlanService {
  /**
   * Helper to validate user has access to a plan's workspace
   */
  static async validatePlanAccess(planId, userId) {
    const plan = await prisma.researchPlan.findUnique({
      where: { id: planId },
      include: {
        run: {
          include: {
            project: {
              include: {
                workspace: {
                  include: { members: { where: { userId } } },
                },
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new AppError("Research plan not found", 404, "PLAN_NOT_FOUND");
    }

    const ws = plan.run.project.workspace;
    const isOwner = ws.ownerId === userId;
    const isMember = ws.members.length > 0;

    if (!isOwner && !isMember) {
      throw new AppError("Access denied to this research plan", 403, "PLAN_FORBIDDEN");
    }

    return { plan, run: plan.run, workspace: ws };
  }

  /**
   * Retrieves the current research plan for a run
   */
  static async getPlanByRunId(runId, userId) {
    const run = await prisma.researchRun.findUnique({
      where: { id: runId },
      include: {
        project: {
          include: {
            workspace: {
              include: { members: { where: { userId } } },
            },
          },
        },
      },
    });

    if (!run) {
      throw new AppError("Research run not found", 404, "RUN_NOT_FOUND");
    }

    const ws = run.project.workspace;
    if (ws.ownerId !== userId && ws.members.length === 0) {
      throw new AppError("Access denied to this research plan", 403, "PLAN_FORBIDDEN");
    }

    const plan = await prisma.researchPlan.findFirst({
      where: { runId },
      orderBy: { version: "desc" },
      include: {
        approvedBy: { select: { id: true, name: true, email: true } },
        tasks: {
          orderBy: { priority: "asc" },
          include: {
            dependencies: true,
          },
        },
      },
    });

    if (!plan) {
      throw new AppError("No research plan generated for this run yet", 404, "PLAN_NOT_FOUND");
    }

    return plan;
  }

  /**
   * Updates plan content or objective (allowed while in DRAFT or pending approval)
   */
  static async updatePlan(planId, userId, data) {
    const { plan } = await this.validatePlanAccess(planId, userId);

    if (plan.status === "APPROVED") {
      throw new AppError("Cannot edit an already approved research plan", 400, "PLAN_ALREADY_APPROVED");
    }

    const updated = await prisma.researchPlan.update({
      where: { id: planId },
      data: {
        ...(data.objective ? { objective: data.objective } : {}),
        ...(data.content ? { content: data.content } : {}),
      },
    });

    return updated;
  }

  /**
   * Approves a research plan and transitions run to RUNNING
   */
  static async approvePlan(planId, userId) {
    const { plan, run } = await this.validatePlanAccess(planId, userId);

    if (plan.status === "APPROVED") {
      return { plan, message: "Plan is already approved" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const approvedPlan = await tx.researchPlan.update({
        where: { id: planId },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          approvedById: userId,
        },
      });

      const updatedRun = await tx.researchRun.update({
        where: { id: run.id },
        data: {
          status: "RUNNING",
        },
      });

      const lastEvent = await tx.researchEvent.findFirst({
        where: { runId: run.id },
        orderBy: { sequence: "desc" },
      });

      await tx.researchEvent.create({
        data: {
          runId: run.id,
          sequence: (lastEvent?.sequence || 0) + 1,
          eventType: "plan.approved",
          message: `Research plan v${plan.version} approved. Resuming execution.`,
          payload: { planId, version: plan.version },
        },
      });

      return { approvedPlan, updatedRun };
    });

    // Notify AI Engine of human approval
    AIEngineClient.post(`/api/v1/research/${run.id}/approve-plan`, {
      plan_id: planId,
      approved_by: userId,
    }).catch((err) => {
      logger.warn(`[AI Engine] Plan approval notification deferred: ${err.message}`);
    });

    return result.approvedPlan;
  }

  /**
   * Rejects a research plan
   */
  static async rejectPlan(planId, userId, reason = "") {
    const { plan, run } = await this.validatePlanAccess(planId, userId);

    const result = await prisma.$transaction(async (tx) => {
      const rejectedPlan = await tx.researchPlan.update({
        where: { id: planId },
        data: {
          status: "REJECTED",
        },
      });

      const updatedRun = await tx.researchRun.update({
        where: { id: run.id },
        data: {
          status: "REQUIRES_INPUT",
          errorMessage: reason || "Plan rejected by user",
        },
      });

      const lastEvent = await tx.researchEvent.findFirst({
        where: { runId: run.id },
        orderBy: { sequence: "desc" },
      });

      await tx.researchEvent.create({
        data: {
          runId: run.id,
          sequence: (lastEvent?.sequence || 0) + 1,
          eventType: "plan.rejected",
          message: `Research plan v${plan.version} rejected by user. Reason: ${reason || "None specified"}`,
          payload: { planId, version: plan.version, reason },
        },
      });

      return { rejectedPlan, updatedRun };
    });

    AIEngineClient.post(`/api/v1/research/${run.id}/reject-plan`, {
      plan_id: planId,
      reason,
    }).catch((err) => {
      logger.warn(`[AI Engine] Plan rejection notification deferred: ${err.message}`);
    });

    return result.rejectedPlan;
  }

  /**
   * Marks current plan as superseded and initiates plan regeneration
   */
  static async regeneratePlan(planId, userId) {
    const { plan, run } = await this.validatePlanAccess(planId, userId);

    await prisma.$transaction(async (tx) => {
      await tx.researchPlan.update({
        where: { id: planId },
        data: { status: "SUPERSEDED" },
      });

      await tx.researchRun.update({
        where: { id: run.id },
        data: { status: "PLANNING" },
      });

      const lastEvent = await tx.researchEvent.findFirst({
        where: { runId: run.id },
        orderBy: { sequence: "desc" },
      });

      await tx.researchEvent.create({
        data: {
          runId: run.id,
          sequence: (lastEvent?.sequence || 0) + 1,
          eventType: "plan.regenerating",
          message: `Regenerating research plan from v${plan.version}.`,
          payload: { previousPlanId: planId },
        },
      });
    });

    AIEngineClient.post(`/api/v1/research/${run.id}/retry`).catch((err) => {
      logger.warn(`[AI Engine] Plan regeneration call deferred: ${err.message}`);
    });

    return { success: true, message: "Plan regeneration requested" };
  }
}

