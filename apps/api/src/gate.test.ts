import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { addDemoGate } from "./gate.js";

function demo(passcode?: string) {
  const app = new Hono().basePath("/api");
  addDemoGate(app, passcode, { secure: false });
  app.get("/health", (c) => c.json({ ok: true }));
  app.get("/kits", (c) => c.json([]));
  app.get("/kits/doctor/page-01.png", (c) => c.text("png"));
  app.post("/events/build", (c) => c.json({ built: true }));
  app.get("/photos/players/x/photo.jpg", (c) => c.text("jpg"));
  return app;
}

const unlock = (app: Hono, code: string, ip = "1.2.3.4") =>
  app.request("/api/unlock", {
    method: "POST",
    body: JSON.stringify({ code }),
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
  });

describe("demo passcode", () => {
  it("is off when no passcode is set (local development)", async () => {
    const app = demo();
    expect((await app.request("/api/events/build", { method: "POST" })).status).toBe(200);
    expect(await (await app.request("/api/unlock")).json()).toEqual({ locked: false });
  });

  it("keeps the player app and health check open, and locks everything else", async () => {
    const app = demo("sunflower");
    expect((await app.request("/api/health")).status).toBe(200);
    expect((await app.request("/api/kits")).status).toBe(200);
    expect((await app.request("/api/kits/doctor/page-01.png")).status).toBe(200);
    expect((await app.request("/api/events/build", { method: "POST" })).status).toBe(401);
    expect((await app.request("/api/photos/players/x/photo.jpg")).status).toBe(401);
  });

  it("opens with the right code, remembered in a cookie that isn't the code", async () => {
    const app = demo("sunflower");
    expect((await unlock(app, "wrong")).status).toBe(401);
    const res = await unlock(app, "sunflower");
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).not.toContain("sunflower");
    const pair = cookie.split(";")[0]!;
    expect((await app.request("/api/events/build", { method: "POST", headers: { Cookie: pair } })).status).toBe(200);
    expect(await (await app.request("/api/unlock", { headers: { Cookie: pair } })).json()).toEqual({ locked: false });
    // A made-up cookie doesn't work.
    expect((await app.request("/api/events/build", { method: "POST", headers: { Cookie: "ss_demo=abc" } })).status).toBe(401);
  });

  it("stops guessing after a few wrong tries", async () => {
    const app = demo("sunflower");
    for (let i = 0; i < 8; i++) await unlock(app, `guess-${i}`, "9.9.9.9");
    expect((await unlock(app, "sunflower", "9.9.9.9")).status).toBe(429);
    // Someone else isn't blocked.
    expect((await unlock(app, "sunflower", "5.5.5.5")).status).toBe(200);
  });
});
