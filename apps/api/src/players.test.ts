import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { samplePlayer } from "@socialstory/core";
import { playerRoutes } from "./playerRoutes.js";
import { loadPlayer } from "./players.js";

describe("child profiles", () => {
  it("always offers Sam, creates new children, and saves edits", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "players-"));
    const app = new Hono().route("/api/players", playerRoutes(dataDir));
    const list = (await (await app.request("/api/players")).json()) as Array<{ id: string }>;
    expect(list.map((p) => p.id)).toEqual([samplePlayer.id]);

    const created = await app.request("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Maya", hardThings: ["crowds"] }),
    });
    expect(created.status).toBe(201);
    const maya = (await created.json()) as { id: string; readingLevel: string; screen: { tap: boolean } };
    expect(maya.id).toMatch(/^player-maya-[0-9a-f]{4}$/);
    expect(maya.readingLevel).toBe("early-reader"); // defaults fill in
    expect(maya.screen.tap).toBe(true);

    await app.request(`/api/players/${samplePlayer.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...samplePlayer, detailLevel: "full" }),
    });
    expect(loadPlayer(samplePlayer.id, dataDir)?.detailLevel).toBe("full");

    const bad = await app.request("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "X", hardThings: ["a-diagnosis"] }),
    });
    expect(bad.status).toBe(400);
  });
});
