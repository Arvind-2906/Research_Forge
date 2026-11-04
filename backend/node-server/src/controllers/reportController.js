import { ReportService } from "../services/reportService.js";

export class ReportController {
  static async list(req, res, next) {
    try {
      const paginated = await ReportService.listReports(req.user.id, req.query);
      res.status(200).json({ success: true, ...paginated });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const report = await ReportService.getReportById(req.params.reportId, req.user.id);
      res.status(200).json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const updated = await ReportService.updateReport(req.params.reportId, req.user.id, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const result = await ReportService.deleteReport(req.params.reportId, req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getCitations(req, res, next) {
    try {
      const citations = await ReportService.getReportCitations(req.params.reportId, req.user.id);
      res.status(200).json({ success: true, data: citations });
    } catch (error) {
      next(error);
    }
  }

  static async addCitation(req, res, next) {
    try {
      const citation = await ReportService.addCitation(req.params.reportId, req.user.id, req.body);
      res.status(201).json({ success: true, data: citation });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCitation(req, res, next) {
    try {
      const result = await ReportService.deleteCitation(
        req.params.reportId,
        req.params.citationId,
        req.user.id
      );
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async createExport(req, res, next) {
    try {
      const format = req.body.format || "MARKDOWN";
      const exportItem = await ReportService.createExport(req.params.reportId, req.user.id, format);
      res.status(201).json({ success: true, data: exportItem });
    } catch (error) {
      next(error);
    }
  }

  static async getExports(req, res, next) {
    try {
      const exports = await ReportService.getReportExports(req.params.reportId, req.user.id);
      res.status(200).json({ success: true, data: exports });
    } catch (error) {
      next(error);
    }
  }

  static async downloadExport(req, res, next) {
    try {
      const { filePath, fileName } = await ReportService.downloadExport(
        req.params.exportId,
        req.user.id
      );
      res.download(filePath, fileName);
    } catch (error) {
      next(error);
    }
  }

  static async validateCitations(req, res, next) {
    try {
      const audit = await ReportService.validateCitations(req.params.reportId, req.user.id);
      res.status(200).json({ success: true, data: audit });
    } catch (error) {
      next(error);
    }
  }
}
