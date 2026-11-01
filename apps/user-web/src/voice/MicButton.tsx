import { useEffect, useRef, useState } from "react";

type State = "idle" | "starting" | "listening" | "finishing";

/**
 * Push-to-talk: tap to start, tap to stop. Streams the microphone to our
 * server (/api/voice), which relays it to Muse Voice Transcribe. Words
 * appear while you talk via onText; onDone gives the final text.
 */
export function MicButton({
  onStart,
  onText,
  onDone,
  disabled,
}: {
  onStart?: () => void;
  onText: (text: string) => void;
  onDone: (text: string) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string>();
  const parts = useRef<{ ws?: WebSocket; stream?: MediaStream; ctx?: AudioContext }>({});

  const release = () => {
    parts.current.stream?.getTracks().forEach((t) => t.stop());
    void parts.current.ctx?.close().catch(() => {});
    parts.current.stream = undefined;
    parts.current.ctx = undefined;
  };

  // Hang up if the screen closes mid-recording.
  useEffect(
    () => () => {
      release();
      parts.current.ws?.close();
    },
    [],
  );

  async function start() {
    setError(undefined);
    setState("starting");
    onStart?.();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const ctx = new AudioContext();
      // Served as a plain file from public/ so every browser can load it.
      await ctx.audioWorklet.addModule("/pcm-worklet.js");
      const node = new AudioWorkletNode(ctx, "pcm-capture");
      ctx.createMediaStreamSource(stream).connect(node);

      const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/voice`);
      ws.binaryType = "arraybuffer";
      parts.current = { ws, stream, ctx };

      node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(e.data);
      };
      ws.onopen = () => setState("listening");
      ws.onmessage = (e) => {
        const msg = JSON.parse(String(e.data)) as { type: string; text?: string; message?: string };
        if (msg.type === "text") onText(msg.text ?? "");
        if (msg.type === "done") {
          onDone(msg.text ?? "");
          setState("idle");
        }
        if (msg.type === "error") {
          setError(msg.message ?? "Something went wrong with the microphone.");
          setState("idle");
          release();
        }
      };
      ws.onclose = () => {
        release();
        setState((s) => (s === "idle" ? s : "idle"));
      };
    } catch (e) {
      release();
      setState("idle");
      const name = (e as Error).name;
      setError(
        name === "NotAllowedError"
          ? "The browser didn't allow the microphone. Allow it in the address bar, or type instead."
          : name === "NotFoundError"
            ? "No microphone found. Plug one in, or type instead."
            : "The microphone couldn't start. You can type instead.",
      );
    }
  }

  function stop() {
    setState("finishing");
    release(); // stop capturing right away; the server finishes the text
    parts.current.ws?.send(JSON.stringify({ type: "stop" }));
  }

  const label = { idle: "🎤 Talk", starting: "Starting…", listening: "■ Stop", finishing: "Finishing…" }[state];
  return (
    <span className="mic">
      <button
        className={state === "listening" ? "mic-button on" : "mic-button"}
        onClick={state === "listening" ? stop : start}
        disabled={disabled || state === "starting" || state === "finishing"}
        aria-pressed={state === "listening"}
        aria-label={state === "listening" ? "Stop talking" : "Answer by talking"}
      >
        {label}
      </button>
      {state === "listening" && <span className="mic-hint">Listening… tap Stop when you're done.</span>}
      {error && <span className="mic-error">{error}</span>}
    </span>
  );
}
