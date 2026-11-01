import WebSocket from "ws";
import { MODEL_IDS } from "@socialstory/core";

/**
 * Live transcription with Muse Voice Transcribe.
 *
 * Meta's protocol (read from LiteLLM's open-source Meta adapter, since
 * Meta's docs site isn't reachable from the build machine):
 *   1. Connect to wss://api.meta.ai/v1/asr/realtime.
 *   2. Send one JSON setup message carrying the key, audio format and mode.
 *      Meta answers with a JSON message containing `sessionId`.
 *   3. Stream mono PCM16 audio as binary frames of 80 ms, no faster than
 *      real time.
 *   4. Send {"type":"endStream"} when the user stops. Meta sends the final
 *      text and closes the connection.
 * Text arrives as `transcript` events (cumulative per turn, `final: true`
 * when settled) and `speechComplete` events (a finished turn).
 *
 * This runs on the server only: the browser never sees the Meta key.
 */

export const MUSE_VOICE_URL = "wss://api.meta.ai/v1/asr/realtime";
export const SAMPLE_RATE = 16_000;
/** 80 ms of 16 kHz mono 16-bit audio. */
export const FRAME_BYTES = (SAMPLE_RATE * 2 * 80) / 1000;
/** Longest single recording. Meta bills per second of audio. */
export const MAX_SECONDS = 180;

export interface TranscriberEvents {
  /** The whole transcript so far, partial words included. */
  onText: (text: string) => void;
  /** Meta finished: the final transcript. */
  onDone: (text: string) => void;
  onError: (message: string) => void;
}

export interface TranscriberOptions {
  apiKey: string;
  url?: string;
  language?: string;
  /** For tests: how often to send a frame (real time is 80 ms). */
  frameMs?: number;
  /**
   * Hands-free: Meta listens for the end of speech (ENDPOINTING mode) and
   * the recording stops by itself when the user finishes talking.
   */
  handsFree?: boolean;
}

export class MuseTranscriber {
  private ws: WebSocket;
  private ready = false;
  private ended = false;
  private finished = false;
  private pending = Buffer.alloc(0);
  private queue: Buffer[] = [];
  private timer?: NodeJS.Timeout;
  private sentBytes = 0;
  /** turn id -> latest text, in the order turns started. */
  private turns = new Map<string, string>();
  private untitled = 0;

  constructor(
    private readonly options: TranscriberOptions,
    private readonly events: TranscriberEvents,
  ) {
    this.ws = new WebSocket(options.url ?? MUSE_VOICE_URL);
    this.ws.on("open", () => {
      this.ws.send(
        JSON.stringify({
          authorization: { accessToken: `Bearer ${options.apiKey}` },
          audioEncoding: "PCM_16KHZ",
          model: MODEL_IDS.transcribe,
          // Tap-to-talk: the user decides when they're done, so Meta shouldn't cut on pauses.
          // Hands-free: Meta's end-of-speech detection ends the answer.
          mode: options.handsFree ? "ENDPOINTING" : "PUSH_TO_TALK",
          partialMode: "CUMULATIVE",
          emitAudioProgress: false,
          languageBias: [options.language ?? "English"],
        }),
      );
    });
    this.ws.on("message", (data, isBinary) => {
      if (isBinary) return;
      this.handle(data.toString());
    });
    this.ws.on("error", () => this.fail("Couldn't reach the transcription service."));
    this.ws.on("close", () => this.finish());
    // Real-time pacing: one frame per tick.
    this.timer = setInterval(() => this.tick(), options.frameMs ?? 80);
  }

  /** Adds raw 16 kHz PCM16 audio from the microphone. */
  push(audio: Buffer) {
    if (this.ended || this.finished) return;
    if (this.sentBytes + this.queue.length * FRAME_BYTES >= MAX_SECONDS * SAMPLE_RATE * 2) {
      this.stop();
      return;
    }
    this.pending = Buffer.concat([this.pending, audio]);
    while (this.pending.length >= FRAME_BYTES) {
      this.queue.push(this.pending.subarray(0, FRAME_BYTES));
      this.pending = this.pending.subarray(FRAME_BYTES);
    }
  }

  /** The user tapped stop: send what's left, then tell Meta the stream is over. */
  stop() {
    if (this.ended) return;
    this.ended = true;
    if (this.pending.length) this.queue.push(this.pending);
    this.pending = Buffer.alloc(0);
  }

  /** Hang up without waiting (the user left the page). */
  close() {
    this.finished = true;
    clearInterval(this.timer);
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) this.ws.terminate();
  }

  get text(): string {
    return [...this.turns.values()].map((t) => t.trim()).filter(Boolean).join(" ");
  }

  private tick() {
    if (!this.ready || this.ws.readyState !== WebSocket.OPEN) return;
    const frame = this.queue.shift();
    if (frame) {
      this.ws.send(frame);
      this.sentBytes += frame.length;
      return;
    }
    if (this.ended) {
      this.ws.send(JSON.stringify({ type: "endStream" }));
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private handle(raw: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    if (!this.ready && typeof msg.sessionId === "string") {
      this.ready = true;
      return;
    }
    const turnId = typeof msg.turnId === "string" ? msg.turnId : undefined;
    switch (msg.type) {
      case "transcript":
      case "speechComplete":
        if (typeof msg.transcript === "string") {
          this.turns.set(turnId ?? this.currentTurn(), msg.transcript);
          this.events.onText(this.text);
        }
        if (!turnId && (msg.final === true || msg.type === "speechComplete")) this.untitled++;
        // Hands-free: the first finished turn is the whole answer.
        if (this.options.handsFree && msg.type === "speechComplete") this.stop();
        break;
      case "error":
        this.fail("The transcription service had a problem. Please try again.");
        break;
    }
  }

  private currentTurn() {
    return `turn-${this.untitled}`;
  }

  private fail(message: string) {
    if (this.finished) return;
    this.finished = true;
    clearInterval(this.timer);
    this.events.onError(message);
    if (this.ws.readyState === WebSocket.OPEN) this.ws.close();
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    clearInterval(this.timer);
    this.events.onDone(this.text);
  }
}
