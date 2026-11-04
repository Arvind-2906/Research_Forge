import { z } from "zod";

export const createMemorySchema = z.object({
  content: z.string().min(1, "Memory content cannot be empty"),
  type: z.enum([
    "RESEARCH_FINDING",
    "USER_PREFERENCE",
    "PROJECT_CONTEXT",
    "IMPORTANT_FACT",
    "RESEARCH_SUMMARY",
  ]),
  scope: z.enum(["USER", "WORKSPACE", "PROJECT"]),
  workspaceId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  snapshotId: z.string().optional().nullable(),
});

export const updateMemorySchema = z.object({
  content: z.string().min(1).optional(),
  metadata: z.record(z.any()).optional().nullable(),
});

export const searchMemorySchema = z.object({
  query: z.string().min(1, "Search query is required"),
  scope: z.enum(["USER", "WORKSPACE", "PROJECT"]).optional().nullable(),
  workspaceId: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  topK: z.number().int().min(1).max(20).optional().default(5),
});

