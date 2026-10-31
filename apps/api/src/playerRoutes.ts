import { Hono } from "hono";
import { DATA_DIR } from "./paths.js";
import { listPlayers, loadPlayer, newPlayerId, savePlayer } from "./players.js";

export function playerRoutes(dataDir = DATA_DIR) {
  const routes = new Hono();
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
