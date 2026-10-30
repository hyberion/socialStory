import { useEffect, useState } from "react";
import { api } from "./api";
import { Editor } from "./Editor";

/**
 * User app home: the stories you can edit. (Accounts come after the
 * hackathon; for now these are the test family's stories.)
 */
export function App() {
  const [ids, setIds] = useState<string[]>();
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState<string>();

  useEffect(() => {
    if (open) return;
    api.list().then(setIds).catch(() => setError("Can't reach the server. Is `pnpm dev` running?"));
  }, [open]);

  if (open) return <Editor id={open} onBack={() => setOpen(undefined)} />;

  return (
    <main className="page">
      <header>
        <h1>socialStory</h1>
        <p className="muted">Your stories</p>
      </header>
      {error && <p className="note bad">{error}</p>}
      {ids?.length === 0 && (
        <p className="card">
          No stories yet. Write one with <code>pnpm write-story doctor</code>, then come back.
        </p>
      )}
      <ul className="story-list">
        {ids?.map((id) => (
          <li key={id}>
            <button className="story-link" onClick={() => setOpen(id)}>
              {id}
              <span className="muted">Review and edit →</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
