import { z } from "zod";

export const createNodeSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  name: z.string().min(1, "Node name is required"),
  type: z
    .enum([
      "TOPIC",
      "CONCEPT",
      "CLAIM",
      "ENTITY",
      "SOURCE",
      "TECHNOLOGY",
      "PERSON",
      "ORGANIZATION",
      "OTHER",
    ])
    .default("CONCEPT"),
  description: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  deduplicate: z.boolean().optional().default(true),
});

export const updateNodeSchema = z.object({
  name: z.string().min(1).optional(),
  type: z
    .enum([
      "TOPIC",
      "CONCEPT",
      "CLAIM",
      "ENTITY",
      "SOURCE",
      "TECHNOLOGY",
      "PERSON",
      "ORGANIZATION",
      "OTHER",
    ])
    .optional(),
  description: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export const createEdgeSchema = z.object({
  sourceNodeId: z.string().min(1, "Source node ID is required"),
  targetNodeId: z.string().min(1, "Target node ID is required"),
  relationship: z
    .enum([
      "RELATED_TO",
      "SUPPORTS",
      "CONTRADICTS",
      "DEPENDS_ON",
      "PART_OF",
      "COMPARES_WITH",
      "REFERENCES",
      "OTHER",
    ])
    .default("RELATED_TO"),
  description: z.string().optional().nullable(),
  weight: z.number().optional().default(1.0),
  metadata: z.record(z.any()).optional().nullable(),
});

export const searchGraphSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  query: z.string().min(1, "Search query is required"),
  nodeType: z.string().optional().nullable(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  minSimilarity: z.number().min(0).max(1).optional().default(0.3),
});

