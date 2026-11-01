import { prisma } from "./prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { getPaginationParams, formatPaginatedResponse } from "../utils/pagination.js";

export class DocumentService {
  /**
   * Validates user has access to a document's parent workspace
   */
  static async validateDocumentAccess(documentId, userId) {
    const document = await prisma.documentAsset.findUnique({
      where: { id: documentId },
      include: {
        workspace: {
          include: { members: { where: { userId } } },
        },
      },
    });

    if (!document) {
      throw new AppError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    const ws = document.workspace;
    const isOwner = ws.ownerId === userId;
    const isMember = ws.members.length > 0;

    if (!isOwner && !isMember) {
      throw new AppError("Access denied to this document", 403, "DOCUMENT_FORBIDDEN");
    }

    return { document, workspace: ws };
  }

  /**
   * Registers a newly uploaded document asset
   */
  static async createDocument(userId, data) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: data.workspaceId },
      include: { members: { where: { userId } } },
    });

    if (!workspace || (workspace.ownerId !== userId && workspace.members.length === 0)) {
      throw new AppError("Access denied to this workspace", 403, "WORKSPACE_FORBIDDEN");
    }

    const created = await prisma.documentAsset.create({
      data: {
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        runId: data.runId,
        fileName: data.fileName,
        originalName: data.originalName,
        mimeType: data.mimeType,
        fileSize: BigInt(data.fileSize),
        storageKey: data.storageKey,
        metadata: data.metadata || {},
        uploadedById: userId,
        status: "UPLOADED",
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      ...created,
      fileSize: Number(created.fileSize),
    };
  }

  /**
   * Lists documents in workspace or project
   */
  static async listDocuments(userId, query) {
    const { page, limit, skip, sortBy, sortOrder } = getPaginationParams(query);

    const where = {
      workspace: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        ...(query.workspaceId ? { id: query.workspaceId } : {}),
      },
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, docs] = await Promise.all([
      prisma.documentAsset.count({ where }),
      prisma.documentAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
          project: { select: { id: true, title: true } },
        },
      }),
    ]);

    const formatted = docs.map((d) => ({
      ...d,
      fileSize: Number(d.fileSize),
    }));

    return formatPaginatedResponse(formatted, total, page, limit);
  }

  /**
   * Retrieves single document metadata by ID
   */
  static async getDocumentById(documentId, userId) {
    const { document } = await this.validateDocumentAccess(documentId, userId);
    return {
      ...document,
      fileSize: Number(document.fileSize),
    };
  }

  /**
   * Deletes a document record
   */
  static async deleteDocument(documentId, userId) {
    await this.validateDocumentAccess(documentId, userId);

    await prisma.documentAsset.delete({
      where: { id: documentId },
    });

    return { success: true, message: "Document deleted successfully" };
  }

  /**
   * Triggers processing/parsing of a document
   */
  static async processDocument(documentId, userId) {
    await this.validateDocumentAccess(documentId, userId);

    const updated = await prisma.documentAsset.update({
      where: { id: documentId },
      data: {
        status: "PROCESSING",
      },
    });

    return {
      ...updated,
      fileSize: Number(updated.fileSize),
      message: "Document processing queued",
    };
  }

  /**
   * Retrieves document processing status
   */
  static async getDocumentStatus(documentId, userId) {
    const { document } = await this.validateDocumentAccess(documentId, userId);
    return {
      id: document.id,
      fileName: document.fileName,
      status: document.status,
      errorMessage: document.errorMessage,
      processedAt: document.processedAt,
      createdAt: document.createdAt,
    };
  }
}

