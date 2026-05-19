import { z } from "zod";

const envSchema = z.object({
  GITHUB_APP_ID: z.string().min(1),
  GITHUB_APP_PRIVATE_KEY: z.string().min(1),
  GITHUB_APP_WEBHOOK_SECRET: z.string().min(1),
  GITHUB_APP_CLIENT_ID: z.string().min(1),
  GITHUB_APP_CLIENT_SECRET: z.string().min(1),
  AI_SERVICE_URL: z.url().default("http://localhost:8000"),
  NEXT_PUBLIC_APP_URL: z.url(),
});

export const env = envSchema.parse(process.env);
