import { z } from "zod";

export const createDocumentSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  projectId: z.string().optional().nullable(),
  runId: z.string().optional().nullable(),
  fileName: z.string().min(1, "File name is required"),
  originalName: z.string().min(1, "Original name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  fileSize: z.number().int().positive("File size must be positive"),
  storageKey: z.string().min(1, "Storage key is required"),
  metadata: z.record(z.any()).optional().nullable(),
});

