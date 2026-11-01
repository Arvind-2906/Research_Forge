import { DocumentService } from "../services/documentService.js";
import { createDocumentSchema } from "../validators/documentValidator.js";

export class DocumentController {
  static async create(req, res, next) {
    try {
      const validated = createDocumentSchema.parse(req.body);
      const document = await DocumentService.createDocument(req.user.id, validated);
      res.status(201).json({ success: true, data: document });
    } catch (error) {
      next(error);
    }
  }

  static async list(req, res, next) {
    try {
      const paginated = await DocumentService.listDocuments(req.user.id, req.query);
      res.status(200).json({ success: true, ...paginated });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const document = await DocumentService.getDocumentById(req.params.documentId, req.user.id);
      res.status(200).json({ success: true, data: document });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const result = await DocumentService.deleteDocument(req.params.documentId, req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async process(req, res, next) {
    try {
      const result = await DocumentService.processDocument(req.params.documentId, req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getStatus(req, res, next) {
    try {
      const status = await DocumentService.getDocumentStatus(req.params.documentId, req.user.id);
      res.status(200).json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }
}

