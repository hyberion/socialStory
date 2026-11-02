import { createHmac, timingSafeEqual } from "node:crypto";
import type { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";

/**
 * The demo passcode. When DEMO_PASSCODE is set (the public demo), everything
 * that can spend money or shows a family's data needs the code first:
 * writing, drawing, interviews, voice, photos, profiles. Published stories
 * (the player app) and the health check stay open, so anyone with the link
 * can always read the finished demo stories.
 *
 * The code is checked once and remembered in a cookie that holds a keyed
 * hash of it, never the code itself.
 */

const COOKIE = "ss_demo";
/** Paths that never need the code. */
const OPEN = [/^\/api\/health$/, /^\/api\/unlock$/, /^\/api\/kits(\/|$)/];

const token = (passcode: string) => createHmac("sha256", passcode).update("socialstory-demo-v1").digest("hex");

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Wrong guesses per address, so the code can't be guessed by trying them all. */
const misses = new Map<string, { count: number; since: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_MISSES = 8;

export function addDemoGate(app: Hono, passcode: string | undefined, options: { secure: boolean }) {
  if (!passcode) {
    // Local development: no gate.
    app.get("/unlock", (c) => c.json({ locked: false }));
    return;
  }
  const expected = token(passcode);
  const unlocked = (c: Parameters<Parameters<Hono["use"]>[1]>[0]) => {
    const got = getCookie(c, COOKIE);
    return !!got && same(got, expected);
  };

  app.use("*", async (c, next) => {
    if (OPEN.some((p) => p.test(c.req.path)) || unlocked(c)) return next();
    return c.json({ error: "This demo needs its passcode.", locked: true }, 401);
  });

  app.get("/unlock", (c) => c.json({ locked: !unlocked(c) }));

  app.post("/unlock", async (c) => {
    const who = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const now = Date.now();
    const m = misses.get(who);
    if (m && now - m.since < WINDOW_MS && m.count >= MAX_MISSES) {
      return c.json({ error: "Too many tries. Please wait a few minutes." }, 429);
    }
    const body = (await c.req.json().catch(() => ({}))) as { code?: unknown };
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code || !same(token(code), expected)) {
      misses.set(who, m && now - m.since < WINDOW_MS ? { count: m.count + 1, since: m.since } : { count: 1, since: now });
      return c.json({ error: "That isn't the passcode." }, 401);
    }
    misses.delete(who);
    setCookie(c, COOKIE, expected, {
      httpOnly: true,
      sameSite: "Lax",
      secure: options.secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return c.json({ locked: false });
  });
}
