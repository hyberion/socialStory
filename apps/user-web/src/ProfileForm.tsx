import { useEffect, useState } from "react";
import {
  COMMUNICATION_LABELS,
  Communication,
  DETAIL_LEVEL_LABELS,
  DetailLevel,
  HARD_THING_LABELS,
  HardThing,
  READING_LEVEL_LABELS,
  READING_LIMITS,
  ReadingLevel,
  WAY_IN_LABELS,
  WayIn,
  suggestFromAge,
  type ComfortItem,
  type PlayerProfile,
} from "@socialstory/core";
import { players } from "./playersApi";

const lines = (text: string) => text.split("\n").map((s) => s.trim()).filter(Boolean);
const commas = (text: string) => text.split(",").map((s) => s.trim()).filter(Boolean);

const BLANK: Omit<PlayerProfile, "id"> = {
  displayName: "",
  readingLevel: "early-reader",
  detailLevel: "standard",
  artStyle: "illustrated",
  perspective: "first",
  sensory: { soundEnabled: true, narrationRate: 0.9, reduceMotion: true },
  reviewMode: "every-stage",
  comforts: [],
  interests: [],
  hardThings: [],
  otherHardThings: [],
  helps: [],
  screen: { tap: true, drag: false, type: false },
  waysIn: ["read", "listen"],
};

/**
 * The child's profile as plain fields and toggles (the interview fills the
 * same fields). Asks what helps and what's hard, never for a diagnosis.
 * Every setting can change any time.
 */
export function ProfileForm({
  id,
  initial,
  onDone,
}: {
  id?: string;
  /** A new child's profile filled in by the interview, to review before saving. */
  initial?: Omit<PlayerProfile, "id">;
  onDone: () => void;
}) {
  const [p, setP] = useState<Omit<PlayerProfile, "id"> & { id?: string }>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  // Free-text fields keep their raw text while typing.
  const [otherHard, setOtherHard] = useState("");
  const [helps, setHelps] = useState("");
  const [interests, setInterests] = useState("");

  useEffect(() => {
    if (!id) {
      const start = initial ?? BLANK;
      setP({ ...start });
      setOtherHard(start.otherHardThings.join("\n"));
      setHelps(start.helps.join("\n"));
      setInterests(start.interests.join(", "));
      return;
    }
    players.load(id).then((loaded) => {
      setP(loaded);
      setOtherHard(loaded.otherHardThings.join("\n"));
      setHelps(loaded.helps.join("\n"));
      setInterests(loaded.interests.join(", "));
    });
  }, [id]);

  if (!p) return <main className="page"><p className="muted">Loading…</p></main>;
  const set = (patch: Partial<PlayerProfile>) => setP({ ...p, ...patch });
  const suggestion = p.age ? suggestFromAge(p.age) : undefined;
  const name = p.displayName.trim() || "your child";

  async function save() {
    if (!p!.displayName.trim()) {
      setError("Add a name first. A nickname is fine.");
      return;
    }
    setSaving(true);
    setError(undefined);
    const profile = { ...p!, otherHardThings: lines(otherHard), helps: lines(helps), interests: commas(interests) };
    try {
      await (p!.id ? players.save(p!.id, profile) : players.create(profile));
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const toggleHard = (h: HardThing) =>
    set({ hardThings: p.hardThings.includes(h) ? p.hardThings.filter((x) => x !== h) : [...p.hardThings, h] });
  const toggleWay = (w: WayIn) =>
    set({ waysIn: p.waysIn.includes(w) ? p.waysIn.filter((x) => x !== w) : [...p.waysIn, w] });
  const moveWay = (i: number, d: number) => {
    const ways = [...p.waysIn];
    [ways[i], ways[i + d]] = [ways[i + d]!, ways[i]!];
    set({ waysIn: ways });
  };
  const setComfort = (i: number, patch: Partial<ComfortItem>) =>
    set({ comforts: p.comforts.map((c, n) => (n === i ? { ...c, ...patch } : c)) });

  return (
    <main className="page">
      <button className="link" onClick={onDone}>← Back</button>
      <h1>{p.id ? `${name}'s profile` : initial ? `Check ${name}'s profile` : "Add a child"}</h1>
      <p className="muted">
        Everything here shapes {name}'s stories and games, and you can change any of it whenever you like. Skip anything you'd
        rather not answer.
      </p>

      <section className="card form">
        <h2>About {name}</h2>
        <label>
          <span>Name or nickname</span>
          <input value={p.displayName} onChange={(e) => set({ displayName: e.target.value })} />
        </label>
        <label>
          <span>What {name} looks like (for the pictures)</span>
          <input
            placeholder="short curly brown hair, brown skin, green t-shirt"
            value={p.appearance ?? ""}
            onChange={(e) => set({ appearance: e.target.value || undefined })}
          />
        </label>
        <label className="short">
          <span>Age (optional)</span>
          <input
            type="number"
            min={1}
            max={30}
            value={p.age ?? ""}
            onChange={(e) => set({ age: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
        {suggestion && (suggestion.readingLevel !== p.readingLevel || suggestion.detailLevel !== p.detailLevel) && (
          <p className="hint">
            Many {p.age}-year-olds start with <strong>{READING_LEVEL_LABELS[suggestion.readingLevel]}</strong> and{" "}
            <strong>{DETAIL_LEVEL_LABELS[suggestion.detailLevel]}</strong> detail. Only a starting point: you know {name}.{" "}
            <button className="small" onClick={() => set(suggestion)}>Use these</button>
          </p>
        )}
      </section>

      <section className="card form">
        <h2>Reading and stories</h2>
        <fieldset>
          <legend>Reading level</legend>
          {ReadingLevel.options.map((r) => (
            <label key={r} className="choice">
              <input type="radio" checked={p.readingLevel === r} onChange={() => set({ readingLevel: r })} />
              <span>
                {READING_LEVEL_LABELS[r]}
                <small>
                  {" "}
                  — up to {READING_LIMITS[r].maxSentencesPerPage} sentence{READING_LIMITS[r].maxSentencesPerPage > 1 ? "s" : ""} a
                  page, {READING_LIMITS[r].maxWords} words each
                </small>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>How much detail</legend>
          {DetailLevel.options.map((d) => (
            <label key={d} className="choice">
              <input type="radio" checked={p.detailLevel === d} onChange={() => set({ detailLevel: d })} />
              <span>{DETAIL_LEVEL_LABELS[d]}<small> — {DETAIL_HELP[d]}</small></span>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Story voice</legend>
          <label className="choice">
            <input type="radio" checked={p.perspective === "first"} onChange={() => set({ perspective: "first" })} />
            <span>"I go to the doctor"</span>
          </label>
          <label className="choice">
            <input type="radio" checked={p.perspective === "third"} onChange={() => set({ perspective: "third" })} />
            <span>"{name === "your child" ? "Sam" : name} goes to the doctor"</span>
          </label>
        </fieldset>
      </section>

      <section className="card form">
        <h2>What's hard, and what helps</h2>
        <p className="muted">
          Stories describe hard things honestly when they'll happen, and offer {name} a choice. We don't ask for a diagnosis:
          what helps and what's hard tells the app more.
        </p>
        <div className="chips">
          {HardThing.options.map((h) => (
            <button key={h} className={p.hardThings.includes(h) ? "chip on" : "chip"} aria-pressed={p.hardThings.includes(h)} onClick={() => toggleHard(h)}>
              {HARD_THING_LABELS[h]}
            </button>
          ))}
        </div>
        <label>
          <span>Anything else that's hard (one per line)</span>
          <textarea rows={2} value={otherHard} onChange={(e) => setOtherHard(e.target.value)} />
        </label>
        <label>
          <span>What helps (one per line)</span>
          <textarea rows={3} placeholder={"knowing what comes next\ndeep breaths with Dad"} value={helps} onChange={(e) => setHelps(e.target.value)} />
        </label>
        <fieldset>
          <legend>Comfort items</legend>
          {p.comforts.map((c, i) => (
            <div key={i} className="row">
              <input placeholder="Name (Bear)" value={c.name} onChange={(e) => setComfort(i, { name: e.target.value, id: c.id || slug(e.target.value) })} />
              <input placeholder="What it looks like" value={c.appearance ?? ""} onChange={(e) => setComfort(i, { appearance: e.target.value || undefined })} />
              <button className="icon" aria-label="Remove" onClick={() => set({ comforts: p.comforts.filter((_, n) => n !== i) })}>×</button>
            </div>
          ))}
          <button className="small" onClick={() => set({ comforts: [...p.comforts, { id: "", name: "" }] })}>+ Add a comfort item</button>
        </fieldset>
        <label>
          <span>Things {name} loves (shape word choice only; never added to events)</span>
          <input placeholder="trains, dinosaurs" value={interests} onChange={(e) => setInterests(e.target.value)} />
        </label>
      </section>

      <section className="card form">
        <h2>Talking, screens and ways in</h2>
        <fieldset>
          <legend>How {name} usually communicates</legend>
          {Communication.options.map((c) => (
            <label key={c} className="choice">
              <input type="radio" checked={p.communication === c} onChange={() => set({ communication: c })} />
              <span>{COMMUNICATION_LABELS[c]}</span>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>On a screen, {name} can comfortably…</legend>
          {(["tap", "drag", "type"] as const).map((k) => (
            <label key={k} className="choice">
              <input type="checkbox" checked={p.screen[k]} onChange={(e) => set({ screen: { ...p.screen, [k]: e.target.checked } })} />
              <span>{{ tap: "Tap things", drag: "Drag things around", type: "Type words" }[k]}</span>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Ways in (first one is shown first)</legend>
          {p.waysIn.map((w, i) => (
            <div key={w} className="row">
              <span className="way">{i + 1}. {WAY_IN_LABELS[w]}</span>
              <button className="icon" disabled={i === 0} onClick={() => moveWay(i, -1)} aria-label="Move up">↑</button>
              <button className="icon" disabled={i === p.waysIn.length - 1} onClick={() => moveWay(i, 1)} aria-label="Move down">↓</button>
              <button className="icon" onClick={() => toggleWay(w)} aria-label="Remove">×</button>
            </div>
          ))}
          {WayIn.options.filter((w) => !p.waysIn.includes(w)).map((w) => (
            <button key={w} className="small" onClick={() => toggleWay(w)}>+ {WAY_IN_LABELS[w]}</button>
          ))}
        </fieldset>
        <fieldset>
          <legend>Sound</legend>
          <label className="choice">
            <input type="checkbox" checked={p.sensory.soundEnabled} onChange={(e) => set({ sensory: { ...p.sensory, soundEnabled: e.target.checked } })} />
            <span>Sound on</span>
          </label>
          <label>
            <span>Reading-aloud speed: {p.sensory.narrationRate.toFixed(1)}x</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.1}
              value={p.sensory.narrationRate}
              onChange={(e) => set({ sensory: { ...p.sensory, narrationRate: Number(e.target.value) } })}
            />
          </label>
        </fieldset>
      </section>

      {error && <p className="note bad">{error}</p>}
      <div className="toolbar bottom">
        <button onClick={onDone}>Cancel</button>
        <button className="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
      </div>
    </main>
  );
}

const DETAIL_HELP: Record<DetailLevel, string> = {
  essentials: "just the steps and the choices",
  standard: "plus how things look, sound and feel",
  more: "plus why things happen and what others are doing",
  full: "plus honest what-ifs and a more grown-up tone",
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
