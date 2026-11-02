import { Hono } from "hono";
import { createNodeWebSocket } from "@hono/node-ws";
import { addVoiceRoute } from "./voiceRoute.js";
import { addDemoGate } from "./gate.js";
import { FLAT_PRICES } from "./budget.js";
import { budget } from "./spend.js";
import { logger } from "hono/logger";
import { sampleStory, validateStory } from "@socialstory/core";
import { config } from "./config.js";
import { runTextTask } from "./meta.js";
import { kitRoutes } from "./kitRoutes.js";
import { playerRoutes } from "./playerRoutes.js";
import { interviewRoutes } from "./interviewRoutes.js";
import { eventRoutes } from "./eventRoutes.js";
import { samSegment } from "./samCall.js";
import { photoFile } from "./media.js";
import { readFileSync } from "node:fs";
import { makeMetaDraftGenerator } from "./generators.js";
import { draftRoutes } from "./draftRoutes.js";
import { runStructuredTask } from "./meta.js";
import { EventInterviewReply, PageDraft, ProfileInterviewReply } from "@socialstory/core";

export const app = new Hono().basePath("/api");

// The demo passcode comes first, so it covers every route below it (voice included).
addDemoGate(app, config.DEMO_PASSCODE, { secure: config.NODE_ENV === "production" });

// Live voice: the browser streams microphone audio here; we relay it to Meta.
export const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
addVoiceRoute(app, upgradeWebSocket, () => {
  // Each spoken answer counts against the demo's daily budget.
  budget.check();
  budget.record(FLAT_PRICES.voice, "voice");
  return { apiKey: config.MODEL_API_KEY, url: config.MUSE_VOICE_URL };
});

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
app.route("/players", playerRoutes(undefined, samSegment));
app.route(
  "/events",
  eventRoutes({
    listen: async (prompt) =>
      (await runStructuredTask("interview", EventInterviewReply, "event_interview_answer", prompt.input, { instructions: prompt.instructions })).data,
    writer: () => makeMetaDraftGenerator(),
    segment: samSegment,
  }),
);

/** The user's photos, for previews in the user app (allow-listed paths only). */
app.get("/photos/*", (c) => {
  const rel = decodeURIComponent(c.req.path.replace(/^\/api\/photos\//, ""));
  const file = photoFile(rel);
  if (!file) return c.json({ error: "Not found" }, 404);
  return c.body(readFileSync(file), 200, {
    "Content-Type": file.endsWith(".png") ? "image/png" : "image/jpeg",
    "Cache-Control": "no-cache",
  });
});
app.route(
  "/interview",
  interviewRoutes({
    listen: async (prompt) =>
      (await runStructuredTask("interview", ProfileInterviewReply, "interview_answer", prompt.input, { instructions: prompt.instructions })).data,
  }),
);

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
  if (err.name === "BudgetReached") return c.json({ ok: false, error: err.message }, 429);
  console.error(err);
  return c.json({ ok: false, error: err.message }, 500);
});
