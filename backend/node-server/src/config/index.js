import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  AI_ENGINE_URL: z.string().default("http://localhost:8000"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.string().default("http://localhost:5000"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  INTERNAL_SERVICE_SECRET: z.string().default("researchforge-internal-service-secret"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[Config] Invalid environment configuration:", parsed.error.format());
  throw new Error("Invalid environment configuration");
}

export const config = parsed.data;

