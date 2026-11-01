import { useEffect, useState } from "react";
import type { Event, PlayerProfile } from "@socialstory/core";
import { NewStory } from "./NewStory";
import { EventOutline } from "./EventOutline";
import { events } from "./eventsApi";
import { api } from "./api";
import { players } from "./playersApi";
import { Editor } from "./Editor";
import { ProfileForm } from "./ProfileForm";
import { ProfileInterview } from "./Interview";

type Screen =
  | { kind: "home" }
  | { kind: "story"; id: string; fromOutline?: boolean }
  | { kind: "profile"; id?: string; initial?: Omit<PlayerProfile, "id"> }
  | { kind: "interview" }
  | { kind: "new-story" }
  | { kind: "outline"; event: Event };

/**
 * User app home: your children and your stories. (Accounts come after the
 * hackathon; for now this is one test family.)
 */
export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "home" });
  const [kids, setKids] = useState<PlayerProfile[]>();
  const [stories, setStories] = useState<string[]>();
  const [saved, setSaved] = useState<Event[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (screen.kind !== "home") return;
    Promise.all([players.list(), api.list(), events.list()])
      .then(([k, s, e]) => {
        setKids(k);
        setStories(s);
        setSaved(e);
      })
      .catch(() => setError("Can't reach the server. Is `pnpm dev` running?"));
  }, [screen]);

  const home = () => setScreen({ kind: "home" });
  const childOf = (e: Event) => kids?.find((k) => k.id === e.playerId)?.displayName;
  const openOutline = (id: string) =>
    events
      .load(id)
      .then((event) => setScreen({ kind: "outline", event }))
      .catch(() => setError("That story was made from a sample event, so it has no outline to open."));

  if (screen.kind === "story")
    return (
      <Editor
        id={screen.id}
        onBack={home}
        onOutline={saved.some((e) => e.id === screen.id) || screen.fromOutline ? () => void openOutline(screen.id) : undefined}
      />
    );
  if (screen.kind === "profile") return <ProfileForm id={screen.id} initial={screen.initial} onDone={home} />;
  if (screen.kind === "new-story")
    return <NewStory onCancel={home} onOutline={(event) => setScreen({ kind: "outline", event })} />;
  if (screen.kind === "outline")
    return (
      <EventOutline
        initial={screen.event}
        childName={childOf(screen.event)}
        hasStory={stories?.includes(screen.event.id)}
        onOpenStory={() => setScreen({ kind: "story", id: screen.event.id, fromOutline: true })}
        onDone={home}
        onWritten={(id) => {
          setStories((s) => [...new Set([...(s ?? []), id])]);
          setScreen({ kind: "story", id, fromOutline: true });
        }}
      />
    );
  if (screen.kind === "interview")
    return <ProfileInterview onCancel={home} onReview={(initial) => setScreen({ kind: "profile", initial })} />;

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
      <ul className="story-list">
        <li>
          <button className="story-link add" onClick={() => setScreen({ kind: "new-story" })}>
            + New story
          </button>
        </li>
        {saved
          .filter((e) => !stories?.includes(e.id))
          .map((e) => (
            <li key={e.id}>
              <button className="story-link" onClick={() => setScreen({ kind: "outline", event: e })}>
                {e.title}
                <span className="muted">Outline, story not written yet →</span>
              </button>
            </li>
          ))}
        {stories?.map((id) => {
          const ev = saved.find((e) => e.id === id);
          return (
            <li key={id} className={ev ? "story-row" : undefined}>
              <button className="story-link" onClick={() => setScreen({ kind: "story", id })}>
                {ev?.title ?? id}
                <span className="muted">Review and edit →</span>
              </button>
              {ev && (
                <button className="small" onClick={() => setScreen({ kind: "outline", event: ev })}>
                  Outline and photo list
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
