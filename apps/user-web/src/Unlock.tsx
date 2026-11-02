import { useEffect, useState, type ReactNode } from "react";

/**
 * The public demo asks for its passcode once, before anything else. Locally
 * (no passcode set on the server) this shows the app straight away.
 */
export function Unlock({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"checking" | "locked" | "open">("checking");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/unlock")
      .then((r) => r.json() as Promise<{ locked: boolean }>)
      .then((r) => setState(r.locked ? "locked" : "open"))
      .catch(() => setState("open")); // can't reach the server: let the app show its own message
  }, []);

  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) setState("open");
      else setError(body.error ?? "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "checking") return null;
  if (state === "open") return <>{children}</>;
  return (
    <main className="unlock">
      <h1>socialStory</h1>
      <p>Stories that help children get ready for new and hard moments.</p>
      <p className="muted">This is a demo. Please enter the passcode you were given.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label>
          Passcode
          <input value={code} onChange={(e) => setCode(e.target.value)} autoFocus autoComplete="off" />
        </label>
        <button type="submit" disabled={busy || !code.trim()}>
          {busy ? "Checking…" : "Open the demo"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </main>
  );
}
