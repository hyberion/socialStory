import { afterEach, describe, expect, it } from "vitest";
import { WebSocketServer, WebSocket } from "ws";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import type { AddressInfo } from "node:net";
import { FRAME_BYTES, MuseTranscriber } from "./museVoice.js";
import { addVoiceRoute } from "./voiceRoute.js";

/** A stand-in for Meta: records what it receives and replies like Muse Voice. */
function fakeMeta() {
  const wss = new WebSocketServer({ port: 0 });
  const got = { setup: undefined as Record<string, unknown> | undefined, frames: [] as number[], endStream: false };
  wss.on("connection", (ws) => {
    ws.on("message", (data, isBinary) => {
      if (isBinary) {
        got.frames.push((data as Buffer).length);
        if (got.frames.length === 2) ws.send(JSON.stringify({ type: "transcript", turnId: "t1", transcript: "Sam has a" }));
        return;
      }
      const msg = JSON.parse(data.toString());
      if (msg.authorization) {
        got.setup = msg;
        ws.send(JSON.stringify({ sessionId: "s1" }));
      } else if (msg.type === "endStream") {
        got.endStream = true;
        ws.send(JSON.stringify({ type: "transcript", turnId: "t1", transcript: "Sam has a doctor visit Tuesday.", final: true }));
        ws.close(1000, "No more transcript segments");
      }
    });
  });
  const url = `ws://127.0.0.1:${(wss.address() as AddressInfo).port}`;
  return { wss, url, got };
}

let cleanup: Array<() => void> = [];
afterEach(() => {
  cleanup.forEach((f) => f());
  cleanup = [];
});

describe("MuseTranscriber", () => {
  it("sends the setup, 80 ms frames, then endStream, and reports the text", async () => {
    const meta = fakeMeta();
    cleanup.push(() => meta.wss.close());
    const texts: string[] = [];
    const done = new Promise<string>((resolve, reject) => {
      const t = new MuseTranscriber({ apiKey: "test-key", url: meta.url, frameMs: 5 }, { onText: (s) => texts.push(s), onDone: resolve, onError: reject });
      t.push(Buffer.alloc(FRAME_BYTES * 2 + 100)); // two whole frames and a bit
      setTimeout(() => t.stop(), 60);
    });
    expect(await done).toBe("Sam has a doctor visit Tuesday.");
    expect(meta.got.setup).toMatchObject({
      authorization: { accessToken: "Bearer test-key" },
      audioEncoding: "PCM_16KHZ",
      model: "muse-voice-transcribe-1.0",
      mode: "PUSH_TO_TALK",
      partialMode: "CUMULATIVE",
    });
    expect(meta.got.frames).toEqual([FRAME_BYTES, FRAME_BYTES, 100]);
    expect(meta.got.endStream).toBe(true);
    expect(texts[0]).toBe("Sam has a");
  });
});

describe("/api/voice", () => {
  it("relays audio from the browser to Meta and text back, without the browser seeing the key", async () => {
    const meta = fakeMeta();
    const app = new Hono().basePath("/api");
    const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
    addVoiceRoute(app, upgradeWebSocket, () => ({ apiKey: "server-only-key", url: meta.url, frameMs: 5 }));
    const server = serve({ fetch: app.fetch, port: 0 });
    injectWebSocket(server);
    await new Promise((r) => server.once("listening", r));
    cleanup.push(() => server.close(), () => meta.wss.close());

    const browser = new WebSocket(`ws://127.0.0.1:${(server.address() as AddressInfo).port}/api/voice`);
    const messages: Array<{ type: string; text?: string }> = [];
    const closed = new Promise<void>((r) => browser.on("close", () => r()));
    browser.on("message", (d) => messages.push(JSON.parse(d.toString())));
    await new Promise((r) => browser.on("open", r));
    browser.send(Buffer.alloc(FRAME_BYTES * 3));
    await new Promise((r) => setTimeout(r, 80));
    browser.send(JSON.stringify({ type: "stop" }));
    await closed;

    expect(messages.at(-1)).toEqual({ type: "done", text: "Sam has a doctor visit Tuesday." });
    expect(messages.some((m) => m.type === "text")).toBe(true);
    expect(JSON.stringify(messages)).not.toContain("server-only-key");
    expect((meta.got.setup?.authorization as { accessToken: string }).accessToken).toBe("Bearer server-only-key");
  });
});

describe("hands-free", () => {
  it("asks Meta to detect the end of speech, and finishes when the turn completes", async () => {
    const wss = new WebSocketServer({ port: 0 });
    let mode = "";
    let ended = false;
    wss.on("connection", (ws) => {
      ws.on("message", (d, bin) => {
        if (bin) return;
        const m = JSON.parse(d.toString());
        if (m.authorization) {
          mode = m.mode;
          ws.send(JSON.stringify({ sessionId: "s" }));
          setTimeout(() => ws.send(JSON.stringify({ type: "speechComplete", turnId: "t1", transcript: "He is nine." })), 30);
        }
        if (m.type === "endStream") {
          ended = true;
          ws.close(1000);
        }
      });
    });
    cleanup.push(() => wss.close());
    const url = `ws://127.0.0.1:${(wss.address() as AddressInfo).port}`;
    const text = await new Promise<string>((resolve, reject) => {
      const t = new MuseTranscriber({ apiKey: "k", url, frameMs: 5, handsFree: true }, { onText: () => {}, onDone: resolve, onError: reject });
      t.push(Buffer.alloc(FRAME_BYTES * 2));
    });
    expect(mode).toBe("ENDPOINTING");
    expect(ended).toBe(true);
    expect(text).toBe("He is nine.");
  });
});
