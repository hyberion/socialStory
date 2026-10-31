import { useEffect, useState } from "react";
import type { PlayerProfile } from "@socialstory/core";
import { api } from "./api";
import { players } from "./playersApi";
import { Editor } from "./Editor";
import { ProfileForm } from "./ProfileForm";
import { Interview } from "./Interview";

type Screen =
  | { kind: "home" }
  | { kind: "story"; id: string }
  | { kind: "profile"; id?: string; initial?: Omit<PlayerProfile, "id"> }
  | { kind: "interview" };

/**
 * User app home: your children and your stories. (Accounts come after the
 * hackathon; for now this is one test family.)
 */
export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const [kids, setKids] = useState<PlayerProfile[]>();
  const [stories, setStories] = useState<string[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (screen.kind !== "home") return;
    Promise.all([players.list(), api.list()])
      .then(([k, s]) => {
        setKids(k);
        setStories(s);
      })
      .catch(() => setError("Can't reach the server. Is `pnpm dev` running?"));
  }, [screen]);

  const home = () => setScreen({ kind: "home" });
  if (screen.kind === "story") return <Editor id={screen.id} onBack={home} />;
  if (screen.kind === "profile") return <ProfileForm id={screen.id} initial={screen.initial} onDone={home} />;
  if (screen.kind === "interview")
    return <Interview onCancel={home} onReview={(initial) => setScreen({ kind: "profile", initial })} />;

  return (
    <main className="page">
      <header>
        <h1>socialStory</h1>
      </header>
      {error && <p className="note bad">{error}</p>}

      <h2>Children</h2>
      <ul className="story-list">
        {kids?.map((k) => (
          <li key={k.id}>
            <button className="story-link" onClick={() => setScreen({ kind: "profile", id: k.id })}>
              {k.displayName}
              <span className="muted">Profile →</span>
            </button>
          </li>
        ))}
        <li className="add-row">
          <button className="story-link add" onClick={() => setScreen({ kind: "interview" })}>
            + Add a child by talking it through
          </button>
          <button className="story-link add" onClick={() => setScreen({ kind: "profile" })}>
            + Add a child with a form
          </button>
        </li>
      </ul>

      <h2>Stories</h2>
      {stories?.length === 0 && (
        <p className="card">
          No stories yet. Write one with <code>pnpm write-story doctor</code>, then come back.
        </p>
      )}
      <ul className="story-list">
        {stories?.map((id) => (
          <li key={id}>
            <button className="story-link" onClick={() => setScreen({ kind: "story", id })}>
              {id}
              <span className="muted">Review and edit →</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
