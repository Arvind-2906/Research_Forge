import { prisma } from "./prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { getPaginationParams, formatPaginatedResponse } from "../utils/pagination.js";

export class ReportService {
  /**
   * Helper to ensure user has access to a report's workspace
   */
  static async validateReportAccess(reportId, userId) {
    const report = await prisma.researchReport.findUnique({
      where: { id: reportId },
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

    if (!report) {
      throw new AppError("Research report not found", 404, "REPORT_NOT_FOUND");
    }

    const ws = report.run.project.workspace;
    const isOwner = ws.ownerId === userId;
    const isMember = ws.members.length > 0;

    if (!isOwner && !isMember) {
      throw new AppError("Access denied to this report", 403, "REPORT_FORBIDDEN");
    }

    return { report, workspace: ws };
  }

  /**
   * Lists all reports accessible to user with pagination
   */
  static async listReports(userId, query) {
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(query);

    const where = {
      run: {
        project: {
          workspace: {
            OR: [{ ownerId: userId }, { members: { some: { userId } } }],
          },
          ...(query.projectId ? { id: query.projectId } : {}),
        },
      },
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { title: { contains: query.search, mode: "insensitive" } } : {}),
    };

    const [total, reports] = await Promise.all([
      prisma.researchReport.count({ where }),
      prisma.researchReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          run: {
            select: {
              id: true,
              question: true,
              project: { select: { id: true, title: true } },
            },
          },
          _count: {
            select: { citations: true, exports: true },
          },
        },
      }),
    ]);

    return formatPaginatedResponse(reports, total, page, limit);
  }

  /**
   * Retrieves detailed report by ID
   */
  static async getReportById(reportId, userId) {
    await this.validateReportAccess(reportId, userId);

    return prisma.researchReport.findUnique({
      where: { id: reportId },
      include: {
        run: {
          select: {
            id: true,
            question: true,
            status: true,
            project: { select: { id: true, title: true, workspaceId: true } },
          },
        },
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
        exports: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * Updates report title or markdown content
   */
  static async updateReport(reportId, userId, data) {
    await this.validateReportAccess(reportId, userId);

    return prisma.researchReport.update({
      where: { id: reportId },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.contentMarkdown ? { contentMarkdown: data.contentMarkdown } : {}),
        ...(data.executiveSummary !== undefined ? { executiveSummary: data.executiveSummary } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });
  }

  /**
   * Deletes a report
   */
  static async deleteReport(reportId, userId) {
    await this.validateReportAccess(reportId, userId);

    await prisma.researchReport.delete({
      where: { id: reportId },
    });

    return { success: true, message: "Report deleted successfully" };
  }

  /**
   * Retrieves citations for a report
   */
  static async getReportCitations(reportId, userId) {
    await this.validateReportAccess(reportId, userId);

    return prisma.reportCitation.findMany({
      where: { reportId },
      include: {
        claim: { select: { id: true, claim: true, status: true } },
        evidence: {
          select: {
            id: true,
            supportingQuote: true,
            confidence: true,
            snapshot: {
              include: { source: { select: { id: true, title: true, url: true } } },
            },
          },
        },
      },
      orderBy: { citationNumber: "asc" },
    });
  }

  /**
   * Queues an export for a report (PDF, DOCX, MARKDOWN, HTML)
   */
  static async createExport(reportId, userId, format) {
    await this.validateReportAccess(reportId, userId);

    const validFormats = ["PDF", "DOCX", "MARKDOWN", "HTML"];
    if (!validFormats.includes(format.toUpperCase())) {
      throw new AppError(
        `Invalid export format. Allowed: ${validFormats.join(", ")}`,
        400,
        "INVALID_FORMAT"
      );
    }

    const reportExport = await prisma.reportExport.create({
      data: {
        reportId,
        format: format.toUpperCase(),
        status: "PENDING",
      },
    });

    return reportExport;
  }
}
