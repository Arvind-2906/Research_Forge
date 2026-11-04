import fs from "fs";
import { prisma } from "./prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { getPaginationParams, formatPaginatedResponse } from "../utils/pagination.js";
import { AIEngineClient } from "./aiEngineClient.js";
import { logger } from "../utils/logger.js";

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
   * Lists all reports accessible to user with pagination (sequential queries for Neon pooler)
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

    // Sequential queries to prevent Neon PgBouncer connection drops
    const total = await prisma.researchReport.count({ where });
    const reports = await prisma.researchReport.findMany({
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
    });

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
   * Adds a new citation to a report
   */
  static async addCitation(reportId, userId, data) {
    await this.validateReportAccess(reportId, userId);

    let citationNumber = data.citationNumber;
    if (!citationNumber) {
      const highest = await prisma.reportCitation.findFirst({
        where: { reportId },
        orderBy: { citationNumber: "desc" },
      });
      citationNumber = (highest?.citationNumber || 0) + 1;
    }

    return prisma.reportCitation.create({
      data: {
        reportId,
        citationNumber,
        locator: data.locator,
        anchor: data.anchor,
        citationText: data.citationText,
        claimId: data.claimId,
        evidenceId: data.evidenceId,
      },
      include: {
        claim: { select: { id: true, claim: true, status: true } },
        evidence: { select: { id: true, supportingQuote: true } },
      },
    });
  }

  /**
   * Deletes a citation from a report
   */
  static async deleteCitation(reportId, citationId, userId) {
    await this.validateReportAccess(reportId, userId);

    const citation = await prisma.reportCitation.findFirst({
      where: { id: citationId, reportId },
    });

    if (!citation) {
      throw new AppError("Citation not found on this report", 404, "CITATION_NOT_FOUND");
    }

    await prisma.reportCitation.delete({
      where: { id: citationId },
    });

    return { success: true, message: "Citation deleted successfully" };
  }

  /**
   * Generates or queues an export for a report (PDF, DOCX, MARKDOWN, HTML)
   */
  static async createExport(reportId, userId, format) {
    await this.validateReportAccess(reportId, userId);

    const validFormats = ["PDF", "DOCX", "MARKDOWN", "HTML"];
    const fmt = format.toUpperCase();
    if (!validFormats.includes(fmt)) {
      throw new AppError(
        `Invalid export format. Allowed: ${validFormats.join(", ")}`,
        400,
        "INVALID_FORMAT"
      );
    }

    // Attempt AI Engine export generation
    try {
      const response = await AIEngineClient.post("/api/v1/reports/export", {
        report_id: reportId,
        format: fmt,
      });

      if (response?.data) {
        return response.data;
      }
    } catch (err) {
      logger.warn(`[ReportService] AI Engine export failed, fallback to pending Prisma record: ${err.message}`);
    }

    // Fallback: create pending export record in Prisma
    const reportExport = await prisma.reportExport.create({
      data: {
        reportId,
        format: fmt,
        status: "PENDING",
        fileName: `${reportId}.${fmt.toLowerCase()}`,
      },
    });

    return reportExport;
  }

  /**
   * Retrieves all exports for a report
   */
  static async getReportExports(reportId, userId) {
    await this.validateReportAccess(reportId, userId);

    return prisma.reportExport.findMany({
      where: { reportId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Retrieves export for download
   */
  static async downloadExport(exportId, userId) {
    const exportRecord = await prisma.reportExport.findUnique({
      where: { id: exportId },
      include: {
        report: {
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
        },
      },
    });

    if (!exportRecord) {
      throw new AppError("Export record not found", 404, "EXPORT_NOT_FOUND");
    }

    const ws = exportRecord.report.run.project.workspace;
    const isOwner = ws.ownerId === userId;
    const isMember = ws.members.length > 0;
    if (!isOwner && !isMember) {
      throw new AppError("Access denied to this export", 403, "EXPORT_FORBIDDEN");
    }

    let filePath = exportRecord.storageKey;
    if (!filePath || !fs.existsSync(filePath)) {
      // Check if file exists in default AI engine export path
      const candidatePath = `storage/exports/${exportRecord.fileName}`;
      if (fs.existsSync(candidatePath)) {
        filePath = candidatePath;
      } else {
        throw new AppError("Export file is not available on disk", 404, "EXPORT_FILE_MISSING");
      }
    }

    return {
      filePath,
      fileName: exportRecord.fileName || `report.${exportRecord.format.toLowerCase()}`,
      format: exportRecord.format,
    };
  }

  /**
   * Validates report citations against registered claims and sources
   */
  static async validateCitations(reportId, userId) {
    const { report } = await this.validateReportAccess(reportId, userId);

    try {
      const response = await AIEngineClient.post("/api/v1/reports/validate-citations", {
        report_id: reportId,
      });
      return response.data;
    } catch (err) {
      logger.warn(`[ReportService] AI Engine citation validation fallback: ${err.message}`);

      // Standalone local audit fallback
      const citations = await prisma.reportCitation.findMany({
        where: { reportId },
      });
      const content = report.contentMarkdown || "";
      const matches = content.match(/\[\^?(\d+)\]/g) || [];
      const citedNumbers = new Set(matches.map((m) => parseInt(m.replace(/[^\d]/g, ""), 10)));
      const registeredNumbers = new Set(citations.map((c) => c.citationNumber));

      const missingFromDb = [...citedNumbers].filter((n) => !registeredNumbers.has(n));
      const unusedInContent = [...registeredNumbers].filter((n) => !citedNumbers.has(n));

      return {
        valid: missingFromDb.length === 0,
        coverage_score:
          citedNumbers.size > 0
            ? Math.round((([...citedNumbers].filter((n) => registeredNumbers.has(n)).length) / citedNumbers.size) * 100)
            : 100,
        total_cited_in_text: citedNumbers.size,
        total_registered_citations: citations.length,
        dangling_citations: unusedInContent,
        unsupported_tags: missingFromDb,
        issues: missingFromDb.map((n) => ({
          severity: "WARNING",
          type: "MISSING_CITATION_RECORD",
          message: `Citation [${n}] referenced in text but not registered.`,
        })),
      };
    }
  }
}
