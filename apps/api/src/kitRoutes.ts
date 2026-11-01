import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { DATA_DIR } from "./paths.js";
import { kitFilePath, listKits, loadKit } from "./kits.js";

/**
 * Read-only routes the player app uses. Nothing here writes, and files are
 * served only by allow-listed names (no paths), so a bad request can't
 * reach anything outside a kit folder.
 */
export function kitRoutes(dataDir = DATA_DIR) {
  const routes = new Hono();

  routes.get("/", (c) => c.json(listKits(dataDir)));

  routes.get("/:id", (c) => {
    const kit = loadKit(c.req.param("id"), dataDir);
    return kit ? c.json(kit) : c.json({ error: "No kit with that id" }, 404);
  });

  routes.get("/:id/:file", (c) => {
    const path = kitFilePath(c.req.param("id"), c.req.param("file"), dataDir);
    if (!path) return c.json({ error: "Not found" }, 404);
    // A published kit never changes in place (publishing again replaces the
    // folder), but its URLs stay the same, so let the browser check back.
    return c.body(readFileSync(path), 200, {
      "Content-Type": path.endsWith(".mp3") ? "audio/mpeg" : "image/png",
      "Cache-Control": "no-cache",
    });
  });

  return routes;
}
