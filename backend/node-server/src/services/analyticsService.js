import { prisma } from "./prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export class AnalyticsService {
  /**
   * Validates user membership or ownership in the workspace
   */
  static async validateWorkspaceAccess(workspaceId, userId) {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: { where: { userId } } },
    });

    if (!ws) {
      throw new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND");
    }

    const isOwner = ws.ownerId === userId;
    const isMember = ws.members.length > 0;

    if (!isOwner && !isMember) {
      throw new AppError("Access denied to this workspace", 403, "WORKSPACE_FORBIDDEN");
    }

    return ws;
  }

  /**
   * Retrieves high-level workspace analytics summary
   */
  static async getOverview(workspaceId, userId) {
    await this.validateWorkspaceAccess(workspaceId, userId);

    const projectWhere = { workspaceId };
    const runWhere = { project: { workspaceId } };

    // Sequential queries for Neon PgBouncer stability
    const totalProjects = await prisma.researchProject.count({ where: projectWhere });
    const totalRuns = await prisma.researchRun.count({ where: runWhere });
    const totalReports = await prisma.researchReport.count({
      where: { run: runWhere },
    });
    const totalSources = await prisma.researchSource.count({
      where: { workspaceId },
    });
    const totalClaims = await prisma.researchClaim.count({
      where: { run: runWhere },
    });

    const tokenAgg = await prisma.lLMInvocation.aggregate({
      where: { run: runWhere },
      _sum: {
        totalTokens: true,
        promptTokens: true,
        completionTokens: true,
        estimatedCost: true,
      },
    });

    return {
      totalProjects,
      totalRuns,
      totalReports,
      totalSources,
      totalClaims,
      tokens: {
        totalTokens: tokenAgg._sum.totalTokens || 0,
        promptTokens: tokenAgg._sum.promptTokens || 0,
        completionTokens: tokenAgg._sum.completionTokens || 0,
        estimatedCost: parseFloat(tokenAgg._sum.estimatedCost || "0"),
      },
    };
  }

  /**
   * Retrieves LLM token usage and cost analytics
   */
  static async getUsage(workspaceId, userId, filter = {}) {
    await this.validateWorkspaceAccess(workspaceId, userId);

    const where = {
      run: { project: { workspaceId } },
      ...(filter.fromDate || filter.toDate
        ? {
            createdAt: {
              ...(filter.fromDate ? { gte: new Date(filter.fromDate) } : {}),
              ...(filter.toDate ? { lte: new Date(filter.toDate) } : {}),
            },
          }
        : {}),
    };

    const aggregates = await prisma.lLMInvocation.aggregate({
      where,
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCost: true,
      },
      _avg: {
        durationMs: true,
      },
      _count: {
        id: true,
      },
    });

    const recentInvocations = await prisma.lLMInvocation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        provider: true,
        modelName: true,
        operation: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCost: true,
        durationMs: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      summary: {
        totalInvocations: aggregates._count.id || 0,
        promptTokens: aggregates._sum.promptTokens || 0,
        completionTokens: aggregates._sum.completionTokens || 0,
        totalTokens: aggregates._sum.totalTokens || 0,
        totalEstimatedCost: parseFloat(aggregates._sum.estimatedCost || "0"),
        avgDurationMs: Math.round(aggregates._avg.durationMs || 0),
      },
      recent: recentInvocations,
    };
  }

  /**
   * Retrieves research run execution metrics
   */
  static async getRunsAnalytics(workspaceId, userId) {
    await this.validateWorkspaceAccess(workspaceId, userId);

    const runWhere = { project: { workspaceId } };

    const totalRuns = await prisma.researchRun.count({ where: runWhere });
    const completedRuns = await prisma.researchRun.count({
      where: { ...runWhere, status: "COMPLETED" },
    });
    const failedRuns = await prisma.researchRun.count({
      where: { ...runWhere, status: "FAILED" },
    });
    const runningRuns = await prisma.researchRun.count({
      where: { ...runWhere, status: "RUNNING" },
    });

    const completedWithTimestamps = await prisma.researchRun.findMany({
      where: {
        ...runWhere,
        status: "COMPLETED",
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: { startedAt: true, completedAt: true },
      take: 100,
    });

    const durations = completedWithTimestamps.map(
      (r) => r.completedAt.getTime() - r.startedAt.getTime()
    );
    const avgDurationMs =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;
    const maxDurationMs = durations.length > 0 ? Math.max(...durations) : 0;
    const minDurationMs = durations.length > 0 ? Math.min(...durations) : 0;

    const successRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0;

    return {
      totalRuns,
      statusBreakdown: {
        COMPLETED: completedRuns,
        FAILED: failedRuns,
        RUNNING: runningRuns,
        OTHER: Math.max(0, totalRuns - (completedRuns + failedRuns + runningRuns)),
      },
      successRate,
      durations: {
        avgDurationMs,
        maxDurationMs,
        minDurationMs,
      },
    };
  }

  /**
   * Retrieves agent execution performance metrics
   */
  static async getAgentsAnalytics(workspaceId, userId) {
    await this.validateWorkspaceAccess(workspaceId, userId);

    const executions = await prisma.agentExecution.findMany({
      where: { run: { project: { workspaceId } } },
      select: {
        agentName: true,
        status: true,
        durationMs: true,
        promptTokens: true,
        completionTokens: true,
      },
    });

    const agentMap = {};
    for (const exec of executions) {
      const name = exec.agentName || "unknown";
      if (!agentMap[name]) {
        agentMap[name] = {
          agentName: name,
          totalExecutions: 0,
          completedCount: 0,
          failedCount: 0,
          totalDurationMs: 0,
          durationCount: 0,
          totalTokens: 0,
        };
      }
      agentMap[name].totalExecutions += 1;
      if (exec.status === "COMPLETED") agentMap[name].completedCount += 1;
      if (exec.status === "FAILED") agentMap[name].failedCount += 1;
      if (exec.durationMs) {
        agentMap[name].totalDurationMs += exec.durationMs;
        agentMap[name].durationCount += 1;
      }
      agentMap[name].totalTokens += (exec.promptTokens || 0) + (exec.completionTokens || 0);
    }

    const agents = Object.values(agentMap).map((a) => ({
      agentName: a.agentName,
      totalExecutions: a.totalExecutions,
      completedCount: a.completedCount,
      failedCount: a.failedCount,
      successRate:
        a.totalExecutions > 0 ? Math.round((a.completedCount / a.totalExecutions) * 100) : 0,
      avgDurationMs: a.durationCount > 0 ? Math.round(a.totalDurationMs / a.durationCount) : 0,
      totalTokens: a.totalTokens,
    }));

    return { totalExecutions: executions.length, agents };
  }

  /**
   * Retrieves model usage breakdown (Groq, OpenAI, etc.)
   */
  static async getModelsAnalytics(workspaceId, userId) {
    await this.validateWorkspaceAccess(workspaceId, userId);

    const invocations = await prisma.lLMInvocation.findMany({
      where: { run: { project: { workspaceId } } },
      select: {
        provider: true,
        modelName: true,
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCost: true,
        durationMs: true,
        status: true,
      },
    });

    const modelMap = {};
    for (const inv of invocations) {
      const key = `${inv.provider}:${inv.modelName}`;
      if (!modelMap[key]) {
        modelMap[key] = {
          provider: inv.provider,
          modelName: inv.modelName,
          invocationsCount: 0,
          totalTokens: 0,
          totalCost: 0,
          totalDurationMs: 0,
          durationCount: 0,
          failedCount: 0,
        };
      }
      modelMap[key].invocationsCount += 1;
      modelMap[key].totalTokens += inv.totalTokens || 0;
      modelMap[key].totalCost += parseFloat(inv.estimatedCost || "0");
      if (inv.durationMs) {
        modelMap[key].totalDurationMs += inv.durationMs;
        modelMap[key].durationCount += 1;
      }
      if (inv.status === "FAILED") modelMap[key].failedCount += 1;
    }

    const models = Object.values(modelMap).map((m) => ({
      provider: m.provider,
      modelName: m.modelName,
      invocationsCount: m.invocationsCount,
      totalTokens: m.totalTokens,
      totalCost: parseFloat(m.totalCost.toFixed(6)),
      avgDurationMs: m.durationCount > 0 ? Math.round(m.totalDurationMs / m.durationCount) : 0,
      failedCount: m.failedCount,
    }));

    return { totalInvocations: invocations.length, models };
  }

  /**
   * Retrieves MCP tool call analytics
   */
  static async getMcpAnalytics(workspaceId, userId) {
    await this.validateWorkspaceAccess(workspaceId, userId);

    const calls = await prisma.mCPToolCall.findMany({
      where: { run: { project: { workspaceId } } },
      select: {
        toolName: true,
        status: true,
        durationMs: true,
        server: { select: { name: true } },
      },
    });

    const toolMap = {};
    for (const c of calls) {
      const name = c.toolName || "unknown";
      if (!toolMap[name]) {
        toolMap[name] = {
          toolName: name,
          serverName: c.server?.name || "Local",
          totalCalls: 0,
          completedCount: 0,
          failedCount: 0,
          totalDurationMs: 0,
          durationCount: 0,
        };
      }
      toolMap[name].totalCalls += 1;
      if (c.status === "SUCCESS" || c.status === "COMPLETED") toolMap[name].completedCount += 1;
      if (c.status === "FAILED") toolMap[name].failedCount += 1;
      if (c.durationMs) {
        toolMap[name].totalDurationMs += c.durationMs;
        toolMap[name].durationCount += 1;
      }
    }

    const tools = Object.values(toolMap).map((t) => ({
      toolName: t.toolName,
      serverName: t.serverName,
      totalCalls: t.totalCalls,
      completedCount: t.completedCount,
      failedCount: t.failedCount,
      successRate: t.totalCalls > 0 ? Math.round((t.completedCount / t.totalCalls) * 100) : 0,
      avgDurationMs: t.durationCount > 0 ? Math.round(t.totalDurationMs / t.durationCount) : 0,
    }));

    return { totalCalls: calls.length, tools };
  }
}
