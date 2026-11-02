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
  /** Read-along narration. Optional: without it the player falls back to the device voice. */
  ELEVENLABS_API_KEY: z.string().optional(),
  /** The voice that reads interview questions (and later, stories). */
  ELEVENLABS_VOICE_ID: z.string().optional(),
  /** Public demo: the passcode judges type before they can generate anything. Unset = no gate (local). */
  DEMO_PASSCODE: z.string().min(4).optional(),
  /** Public demo: most the server may spend on AI calls per day, in US dollars. Unset = no cap (local). */
  DAILY_BUDGET_USD: z.coerce.number().positive().optional(),
  /** Testing only: send live voice to a stand-in instead of Meta. */
  MUSE_VOICE_URL: z.string().url().optional(),
});

const parsed = Env.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  console.error(`\nConfig error${envFile ? ` (loaded ${envFile})` : " (no .env found)"}:\n${problems}\n`);
  process.exit(1);
}

export const config = parsed.data;
