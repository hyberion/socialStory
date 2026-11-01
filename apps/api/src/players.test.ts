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

import sharp from "sharp";
import { existsSync } from "node:fs";
import { castFor, sampleEvent } from "@socialstory/core";

describe("the child's own photo", () => {
  it("gets a SAM cutout, draws their portrait, and can be removed", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "players-photo-"));
    const fakeSegment = async () => ({ bounds: { left: 2, top: 2, right: 12, bottom: 12 }, raster: new Uint8Array(100).fill(1) });
    const app = new Hono().route("/api/players", playerRoutes(dataDir, fakeSegment));
    const photo = await sharp({ create: { width: 30, height: 30, channels: 3, background: "#a07050" } }).jpeg().toBuffer();
    const r = (await (await app.request(`/api/players/${samplePlayer.id}/photo`, { method: "POST", body: photo, headers: { "Content-Type": "image/jpeg" } })).json()) as {
      player: { photo?: { src: string; cutout?: string } };
      cutout: string;
    };
    expect(r.cutout).toBe("made");
    expect(r.player.photo?.cutout).toBe("players/player-sam/photo-cutout.png");
    expect(existsSync(join(dataDir, "photos", "players/player-sam/photo-cutout.png"))).toBe(true);
    const saved = loadPlayer(samplePlayer.id, dataDir)!;
    expect(castFor(sampleEvent, saved).find((m) => m.id === "player")?.photo?.cutout).toBeDefined();

    await app.request(`/api/players/${samplePlayer.id}/photo`, { method: "DELETE" });
    expect(loadPlayer(samplePlayer.id, dataDir)?.photo).toBeUndefined();
    expect(existsSync(join(dataDir, "photos", "players/player-sam/photo.jpg"))).toBe(false);
  });
});
