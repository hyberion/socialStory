import { Hono } from "hono";
import { DATA_DIR } from "./paths.js";
import { listPlayers, loadPlayer, newPlayerId, savePlayer } from "./players.js";
import { addPlayerPhoto, removePlayerPhoto } from "./media.js";
import type { Segmenter } from "./sam.js";

export function playerRoutes(dataDir = DATA_DIR, segment?: Segmenter) {
  const routes = new Hono();

  /** The child's own photo (raw image bytes in the body): only used to draw them. */
  routes.post("/:id/photo", async (c) => {
    const p = loadPlayer(c.req.param("id"), dataDir);
    if (!p) return c.json({ error: "No child with that id" }, 404);
    if (!segment) return c.json({ error: "Photos aren't available here." }, 400);
    const upload = Buffer.from(await c.req.arrayBuffer());
    if (!upload.length || upload.length > 15 * 1024 * 1024) return c.json({ error: "Send one photo under 15 MB." }, 400);
    try {
      const r = await addPlayerPhoto({ player: p, upload, segment }, dataDir);
      return c.json({ player: savePlayer(r.player, dataDir), cutout: r.cutout });
    } catch {
      return c.json({ error: "That file isn't a photo the app can read. Try a JPG or PNG." }, 400);
    }
  });
  routes.delete("/:id/photo", (c) => {
    const p = loadPlayer(c.req.param("id"), dataDir);
    if (!p) return c.json({ error: "No child with that id" }, 404);
    return c.json({ player: savePlayer(removePlayerPhoto(p, dataDir), dataDir) });
  });

  routes.get("/", (c) => c.json(listPlayers(dataDir)));
  routes.get("/:id", (c) => {
    const p = loadPlayer(c.req.param("id"), dataDir);
    return p ? c.json(p) : c.json({ error: "No child with that id" }, 404);
  });
  routes.post("/", async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>;
    try {
      return c.json(savePlayer({ ...body, id: newPlayerId(String(body.displayName ?? "")) }, dataDir), 201);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  });
  routes.put("/:id", async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>;
    try {
      return c.json(savePlayer({ ...body, id: c.req.param("id") }, dataDir));
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  });
  return routes;
}
