import { useEffect, useState } from "react";
import { sampleEvent, sampleStory, validateStory } from "@socialstory/core";

type Health = { ok: boolean; env: string } | { error: string };

/**
 * Placeholder home screen. Proves the three pieces talk to each other:
 * this app, the API (health check), and the shared core package
 * (validator running right here in the browser).
 */
export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const validation = validateStory(sampleStory);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ error: "API not reachable. Is `pnpm dev:api` running?" }));
  }, []);

  return (
    <main className="page">
      <header>
        <h1>socialStory</h1>
        <p className="muted">Parent app · scaffold</p>
      </header>

      <section className="card">
        <h2>System check</h2>
        <ul className="checks">
          <li>
            API:{" "}
            {health === null
              ? "checking..."
              : "error" in health
                ? <span className="bad">{health.error}</span>
                : <span className="good">connected ({health.env})</span>}
          </li>
          <li>
            Shared core: <span className="good">loaded</span>
          </li>
          <li>
            Sample story validator:{" "}
            <span className={validation.ok ? "good" : "bad"}>
              {validation.ok ? "passes" : "fails"}
            </span>{" "}
            ({validation.stats.describing} describing : {validation.stats.coaching} coaching)
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>Sample event</h2>
        <p>
          <strong>{sampleEvent.title}</strong> · {new Date(sampleEvent.startsAt).toLocaleString()}
        </p>
        <ol>
          {sampleEvent.steps.map((s) => (
            <li key={s.id}>
              {s.description}
              {s.fixed && <span className="tag">fixed</span>}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
