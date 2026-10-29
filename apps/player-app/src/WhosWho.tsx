import { useEffect, useMemo, useState } from "react";
import type { KitCastMember, PublishedKit } from "@socialstory/core";
import { kitFileUrl } from "./api";

/** The game needs at least two portraits to offer a choice. */
export const canPlayWhosWho = (portraits: number) => portraits >= 2;

/** Up to three names: the right one plus others from the cast, in a stable mixed order. */
function choicesFor(member: KitCastMember, cast: KitCastMember[], round: number): KitCastMember[] {
  // People get other people's names first, comfort items get other items first.
  const others = cast
    .filter((m) => m.id !== member.id)
    .sort((a, b) => Number(a.kind !== member.kind) - Number(b.kind !== member.kind));
  const picked = others.slice(0, 2);
  const all = [member, ...picked];
  const shift = round % all.length;
  return [...all.slice(shift), ...all.slice(0, shift)];
}

/**
 * "Who's who?": see a portrait, tap a name, hear who it is.
 * Built only from what the user approved and published.
 * Rules: no scores, no timers, no "wrong". Any tap shows the answer the
 * same calm way, with a friendly fact. Sound only from the speaker button.
 */
export function WhosWho({ kit, onHome }: { kit: PublishedKit; onHome: () => void }) {
  const players = useMemo(() => kit.cast.filter((m) => m.portrait), [kit]);
  const [index, setIndex] = useState(0);
  const [tapped, setTapped] = useState<string | undefined>();
  const member = players[index]!;
  const choices = useMemo(() => choicesFor(member, kit.cast, index), [member, kit.cast, index]);
  const revealed = tapped !== undefined;
  const isLast = index === players.length - 1;
  const canSpeak = kit.sensory.soundEnabled && "speechSynthesis" in window;

  useEffect(() => () => window.speechSynthesis?.cancel(), [index, revealed]);

  function say(text: string) {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = kit.sensory.narrationRate;
    window.speechSynthesis.speak(u);
  }

  const names = choices.map((c) => c.name);
  const question = `Who is this? Is it ${names.slice(0, -1).join(", ")} or ${names.at(-1)}?`;
  const answer = [member.intro, ...member.facts].join(" ");

  function next() {
    setTapped(undefined);
    setIndex(isLast ? 0 : index + 1);
  }

  return (
    <main className="reader">
      <header className="top">
        <button className="nav small" onClick={onHome} aria-label="All my stories">
          ⌂
        </button>
        <h1 className="title">Who's who?</h1>
        <span />
      </header>

      <section className="page game" aria-live="polite">
        <img className="portrait" src={kitFileUrl(kit.id, member.portrait!)} alt="" />
        {revealed ? (
          <div className="words">
            <p>{member.intro}</p>
            {member.facts.map((f) => (
              <p key={f}>{f}</p>
            ))}
          </div>
        ) : (
          <div className="words">
            <p>Who is this?</p>
          </div>
        )}
        <div className="choices">
          {choices.map((c) => (
            <button
              key={c.id}
              className={revealed && c.id === member.id ? "choice this-one" : "choice"}
              onClick={() => !revealed && setTapped(c.id)}
              aria-pressed={tapped === c.id}
            >
              {c.name}
            </button>
          ))}
        </div>
      </section>

      <nav className="controls">
        <span className="nav-spacer" />
        <div className="dots" aria-label={`${index + 1} of ${players.length}`}>
          {players.map((m, i) => (
            <span key={m.id} className={i === index ? "dot on" : "dot"} />
          ))}
        </div>
        {canSpeak && (
          <button className="nav" onClick={() => say(revealed ? answer : question)} aria-label="Say it to me">
            🔈
          </button>
        )}
        <button className="nav" onClick={next} aria-label={isLast ? "Start again" : "Next"}>
          {isLast ? "↺" : "→"}
        </button>
      </nav>
    </main>
  );
}
