import { z } from "zod";

export const createProjectSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  title: z.string().min(1, "Project title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  settings: z.record(z.any()).optional().nullable(),
});

export const updateProjectSchema = z.object({
  title: z.string().min(1, "Project title cannot be empty").max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  settings: z.record(z.any()).optional().nullable(),
});

