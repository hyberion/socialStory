import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

/**
 * Loads the repo-root .env in development (Docker passes real env vars
 * in production), then validates everything the API needs up front so
 * a missing key fails loudly at startup instead of mid-request.
 */
function loadDotEnv() {
  const candidates = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")];
  for (const file of candidates) {
    if (existsSync(file)) {
      process.loadEnvFile(file);
      return file;
    }
  }
  return undefined;
}

const envFile = loadDotEnv();

const Env = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(8787),
  MODEL_API_KEY: z
    .string({ required_error: "missing. Copy .env.example to .env and add your Meta key." })
    .min(1, "is empty. Add your Meta key to .env."),
  MODEL_API_BASE_URL: z.string().url().default("https://api.meta.ai/v1"),
  DATABASE_URL: z.string().optional(),
});

const parsed = Env.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  console.error(`\nConfig error${envFile ? ` (loaded ${envFile})` : " (no .env found)"}:\n${problems}\n`);
  process.exit(1);
}

export const config = parsed.data;
