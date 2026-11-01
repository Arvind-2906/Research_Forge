import { z } from "zod";

export const updatePlanSchema = z.object({
  objective: z.string().min(5, "Objective must be at least 5 characters").optional(),
  content: z.record(z.any()).optional(),
});

export const rejectPlanSchema = z.object({
  reason: z.string().max(1000).optional(),
});

