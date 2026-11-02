import type { Hono } from "hono";
import type { UpgradeWebSocket } from "hono/ws";
import { MuseTranscriber, type TranscriberOptions } from "./museVoice.js";

/**
 * /api/voice: a WebSocket between the user app and our server.
 * Browser -> server: binary 16 kHz PCM16 audio; then {"type":"stop"}.
 * Server -> browser: {"type":"text","text"} as words arrive, then
 * {"type":"done","text"} or {"type":"error","message"}.
 * The server holds the Meta connection (and the key).
 */
export function addVoiceRoute(
  app: Hono,
  upgradeWebSocket: UpgradeWebSocket,
  options: () => TranscriberOptions,
) {
  app.get(
    "/voice",
    upgradeWebSocket((c) => {
      const handsFree = c.req.query("handsFree") === "1";
      let transcriber: MuseTranscriber | undefined;
      return {
        onOpen(_event, ws) {
          const send = (msg: object) => {
            try {
              ws.send(JSON.stringify(msg));
            } catch {
              /* browser already gone */
            }
          };
          let opts: TranscriberOptions;
          try {
            opts = options();
          } catch (err) {
            // e.g. the demo's daily budget is used up
            send({ type: "error", message: (err as Error).message });
            ws.close();
            return;
          }
          transcriber = new MuseTranscriber({ ...opts, handsFree }, {
            onText: (text) => send({ type: "text", text }),
            onDone: (text) => {
              send({ type: "done", text });
              ws.close();
            },
            onError: (message) => {
              send({ type: "error", message });
              ws.close();
            },
          });
        },
        onMessage(event) {
          const data = event.data;
          if (typeof data === "string") {
            if (data.includes('"stop"')) transcriber?.stop();
            return;
          }
          const buf =
            data instanceof ArrayBuffer
              ? Buffer.from(data)
              : Buffer.isBuffer(data)
                ? data
                : Buffer.from(data as unknown as ArrayBuffer);
          transcriber?.push(buf);
        },
        onClose() {
          transcriber?.close();
        },
      };
    }),
  );
}
