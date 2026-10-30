import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Hono } from "hono";
import { castFor, validateStory } from "@socialstory/core";
import { DATA_DIR, imagesDir } from "./paths.js";
import { draftContext, keepPicture, listDrafts, loadDraft, loadStory, rewritePage, saveDraft, type RewritePage } from "./drafts.js";
import { publishKit } from "./kits.js";

/**
 * The user app's editing routes. `rewrite` is passed in so tests run
 * without a Meta key.
 */
export function draftRoutes(options: { rewrite: RewritePage; dataDir?: string }) {
  const dataDir = options.dataDir ?? DATA_DIR;
  const routes = new Hono();

  routes.get("/", (c) => c.json(listDrafts(dataDir)));

  routes.get("/:id", (c) => {
    const draft = loadDraft(c.req.param("id"), dataDir);
    return draft ? c.json(draft) : c.json({ error: "No story with that id" }, 404);
  });

  routes.get("/:id/images/:file", (c) => {
    const id = c.req.param("id");
    const file = c.req.param("file");
    if (!draftContext(id) || !/^(page-\d{2}|cast-[a-z0-9-]+)\.png$/.test(file)) return c.json({ error: "Not found" }, 404);
    const path = resolve(imagesDir(id, dataDir), file);
    if (!existsSync(path)) return c.json({ error: "Not found" }, 404);
    return c.body(readFileSync(path), 200, { "Content-Type": "image/png", "Cache-Control": "no-cache" });
  });

  routes.put("/:id", async (c) => {
    const body = await c.req.json();
    try {
      saveDraft(c.req.param("id"), body, dataDir);
      return c.json(loadDraft(c.req.param("id"), dataDir));
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  });

  routes.post("/:id/pages/:n/keep", (c) => {
    try {
      keepPicture(c.req.param("id"), Number(c.req.param("n")), dataDir);
      return c.json(loadDraft(c.req.param("id"), dataDir));
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  });

  routes.post("/:id/pages/:n/rewrite", async (c) => {
    const body = (await c.req.json()) as { story: unknown; note?: string };
    const page = await rewritePage(
      c.req.param("id"),
      { story: body.story, pageIndex: Number(c.req.param("n")), note: body.note },
      options.rewrite,
    );
    return c.json(page);
  });

  /** Publishes the saved story. The checker warns but never blocks: the user decides. */
  routes.post("/:id/publish", (c) => {
    const id = c.req.param("id");
    const ctx = draftContext(id);
    const story = loadStory(id, dataDir);
    if (!ctx || !story) return c.json({ error: "No story with that id" }, 404);
    const check = validateStory(story, { cast: castFor(ctx.event, ctx.player) });
    const { kit, warnings } = publishKit({ id, event: ctx.event, player: ctx.player, story }, dataDir);
    return c.json({
      publishedAt: kit.publishedAt,
      warnings: [...check.issues.map((i) => ({ page: i.page, message: i.message })), ...warnings],
    });
  });

  return routes;
}
