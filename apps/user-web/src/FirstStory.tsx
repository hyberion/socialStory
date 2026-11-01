import { useState } from "react";
import type { PlayerProfile } from "@socialstory/core";
import { events } from "./eventsApi";

/**
 * Offered right after a child is added: their first story, "All about me".
 * Affirming, made only from the profile, and it shows the child how the
 * app works before any story about something hard.
 */
export function FirstStory({ player, onWritten, onSkip }: { player: PlayerProfile; onWritten: (id: string) => void; onSkip: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const name = player.displayName;

  async function make() {
    setBusy(true);
    setError(undefined);
    try {
      onWritten((await events.aboutMe(player.id)).id);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <h1>{name}'s profile is saved</h1>
      <section className="card form">
        <h2>Make {name}'s first story?</h2>
        <p>
          A short, happy <strong>"All about {name}"</strong> story, made only from what you just told us: what {name} looks like,
          what {name} loves, what helps, and {name}'s comfort items. Nothing hard, no events.
        </p>
        <ul>
          <li>{name} gets to know the drawn character as <em>me</em>, before that character shows up at the doctor or a new school.</li>
          <li>{name} learns how the app works (turning pages, the speaker, the shelf) on a story with nothing worrying in it.</li>
          <li>You get a first look at the pictures and can fix anything that doesn't look like {name}. Nothing reaches {name} until you publish it.</li>
        </ul>
        {error && <p className="note bad">{error}</p>}
        <div className="toolbar bottom">
          <button onClick={onSkip} disabled={busy}>Not now</button>
          <button className="primary" onClick={() => void make()} disabled={busy}>
            {busy ? "Writing (about 10 seconds)…" : `Make "All about ${name}"`}
          </button>
        </div>
      </section>
    </main>
  );
}
