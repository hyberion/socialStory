import { Hono } from "hono";
import { logger } from "hono/logger";
import { sampleStory, validateStory } from "@socialstory/core";
import { config } from "./config.js";
import { runTextTask } from "./meta.js";
import { kitRoutes } from "./kitRoutes.js";

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

app.onError((err, c) => {
  console.error(err);
  return c.json({ ok: false, error: err.message }, 500);
});
