import { z } from "zod";

export const updateUserProfileSchema = z.object({
  name: z.string().min(1, "Name cannot be empty").max(100).optional(),
  image: z.string().url("Image must be a valid URL").optional().nullable(),
});

export const updateUserPreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  emailNotifications: z.boolean().optional(),
  defaultResearchDepth: z.enum(["shallow", "standard", "deep"]).optional(),
  defaultSearchEngine: z.enum(["tavily", "exa", "all"]).optional(),
  autoApprovePlans: z.boolean().optional(),
  customPreferences: z.record(z.any()).optional(),
});

