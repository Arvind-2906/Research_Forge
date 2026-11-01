import { z } from "zod";

export const createRunSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  question: z.string().min(5, "Research question must be at least 5 characters long"),
  configuration: z
    .object({
      researchDepth: z.enum(["shallow", "standard", "deep"]).default("standard"),
      searchEngines: z.array(z.string()).default(["tavily", "exa"]),
      autoApprovePlan: z.boolean().default(false),
      maxIterations: z.number().int().min(1).max(5).default(2),
    })
    .default({}),
});

