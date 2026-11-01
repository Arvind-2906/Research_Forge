import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100),
  description: z.string().max(1000).optional(),
  settings: z.record(z.any()).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name cannot be empty").max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  settings: z.record(z.any()).optional().nullable(),
});

export const addMemberSchema = z.object({
  email: z.string().email("Valid email required").optional(),
  userId: z.string().optional(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).default("MEMBER"),
}).refine((data) => data.email || data.userId, {
  message: "Either email or userId must be provided to add a member",
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

