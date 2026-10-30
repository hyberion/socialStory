import { Hono } from "hono";
import { logger } from "hono/logger";
import { sampleStory, validateStory } from "@socialstory/core";
import { config } from "./config.js";
import { runTextTask } from "./meta.js";
import { kitRoutes } from "./kitRoutes.js";
import { makeMetaDraftGenerator } from "./generators.js";
import { draftRoutes } from "./draftRoutes.js";
import { runStructuredTask } from "./meta.js";
import { PageDraft } from "@socialstory/core";

export const app = new Hono().basePath("/api");

app.use(logger());

app.get("/health", (c) =>
  c.json({ ok: true, env: config.NODE_ENV, time: new Date().toISOString() }),
);

/** Runs the Gray-criteria validator on the sample story. Proves core is wired in. */
app.get("/dev/validate-sample", (c) => c.json(validateStory(sampleStory)));

/** One cheap model call. Disabled in production so it can't burn credits. */
app.get("/dev/smoke", async (c) => {
  if (config.NODE_ENV === "production") return c.notFound();
  const result = await runTextTask("smoke", "Say hello in five words.");
  return c.json(result);
});

app.route("/kits", kitRoutes());

// Editing routes for the user app. No sign-in yet, so these are for local
// use and the passcode-protected demo only (see docs/launch-checklist.md).
app.route(
  "/drafts",
  draftRoutes({
    // "Take more care" uses high effort: about 30 seconds instead of 10.
    writer: (care) => makeMetaDraftGenerator(care ? { effort: "high" } : {}),
    rewrite: async (prompt) =>
      (await runStructuredTask("rewritePage", PageDraft, "story_page", prompt.input, { instructions: prompt.instructions })).data,
  }),
);

app.onError((err, c) => {
  console.error(err);
  return c.json({ ok: false, error: err.message }, 500);
});
