import { useEffect, useRef, useState } from "react";
import { photoListText, type Event, type PhotoChecklist, type Person, type Step } from "@socialstory/core";
import { events, localOffset } from "./eventsApi";

const lines = (t: string) => t.split("\n").map((s) => s.trim()).filter(Boolean);

let counter = 0;
const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${counter++}`;

/** "2026-11-03T10:00:00-05:00" -> "2026-11-03T10:00" for a date-time box (the event's own wall clock). */
const toLocalInput = (iso: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso) ? iso.slice(0, 16) : "");

/**
 * The outline: the whole event, every part editable, before any story is
 * written. Saving it gives the photo to-do list; the story can be written
 * now or after gathering photos.
 */
export function EventOutline({
  initial,
  childName,
  onWritten,
  onDone,
  hasStory,
  onOpenStory,
}: {
  initial: Event;
  childName?: string;
  onWritten: (id: string) => void;
  onDone: () => void;
  /** The story is already written: offer to open it instead of writing again. */
  hasStory?: boolean;
  onOpenStory?: () => void;
}) {
  const [e, setE] = useState<Event>(initial);
  const [saved, setSaved] = useState(initial.id !== "new");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [photos, setPhotos] = useState<PhotoChecklist>();
  const [hard, setHard] = useState(initial.hardParts.map((h) => h.description).join("\n"));

  useEffect(() => {
    if (saved && e.id !== "new") events.photos(e.id).then(setPhotos).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, e.id]);

  const set = (patch: Partial<Event>) => {
    setE({ ...e, ...patch });
    setDirty(true);
  };
  const setStep = (i: number, patch: Partial<Step>) => set({ steps: e.steps.map((s, n) => (n === i ? { ...s, ...patch } : s)) });
  const moveStep = (i: number, d: number) => {
    const steps = [...e.steps];
    [steps[i], steps[i + d]] = [steps[i + d]!, steps[i]!];
    set({ steps });
  };
  const setPerson = (list: "people" | "companions", i: number, patch: Partial<Person>) =>
    set({ [list]: e[list].map((p, n) => (n === i ? { ...p, ...patch } : p)) } as Partial<Event>);
  // Renaming someone ("the nurse" -> "Nurse Kim") also renames them in the steps,
  // once, when the name box is left (not on every keystroke).
  const nameAtFocus = useRef("");
  const renameInSteps = (from: string, to: string) => {
    if (from.trim().length < 2 || !to.trim() || from === to) return;
    const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    set({ steps: e.steps.map((s) => ({ ...s, description: s.description.replace(re, to.trim()) })) });
  };


  async function save(): Promise<Event | undefined> {
    setBusy("Saving…");
    setError(undefined);
    try {
      const toSave: Event = {
        ...e,
        hardParts: lines(hard).map((d, i) => ({ id: e.hardParts[i]?.id ?? `h${i + 1}`, description: d, stepId: e.hardParts[i]?.stepId })),
      };
      const result = e.id === "new" ? await events.create(toSave) : await events.save(toSave);
      setE(result);
      setSaved(true);
      setDirty(false);
      return result;
    } catch (err) {
      setError((err as Error).message);
      return undefined;
    } finally {
      setBusy(undefined);
    }
  }

  async function write() {
    const ev = dirty || !saved ? await save() : e;
    if (!ev) return;
    setBusy("Writing the story (about 10 seconds)…");
    try {
      await events.write(ev.id);
      onWritten(ev.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(undefined);
    }
  }

  const listText = () => (photos ? photoListText(e, childName ?? "your child", photos) : "");
  const [copied, setCopied] = useState(false);
  async function copyList() {
    try {
      await navigator.clipboard.writeText(listText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Try Print or Email instead.");
    }
  }
  async function shareList() {
    try {
      await navigator.share({ title: `Photos for ${e.title}`, text: listText() });
    } catch {
      /* the user closed the share sheet */
    }
  }
  /** Prints only the photo list, as a checklist. */
  function printList() {
    document.body.classList.add("print-photos");
    const done = () => {
      document.body.classList.remove("print-photos");
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.print();
  }

  const everyone = [...e.companions, ...e.people];
  const most = photos?.items.filter((p) => p.priority === "most-helpful") ?? [];
  const nice = photos?.items.filter((p) => p.priority === "nice-to-have") ?? [];

  return (
    <main className="page wide">
      <button className="link" onClick={onDone}>← Home</button>
      <h1>Outline</h1>
      <p className="muted">
        This is the plan the story is written from. Change anything; leave out what you don't know yet. Nothing is written until
        you say so.
      </p>

      <section className="card form">
        <label>
          <span>What it's called</span>
          <input value={e.title} onChange={(x) => set({ title: x.target.value })} />
        </label>
        <div className="row">
          <label>
            <span>When</span>
            <input
              type="datetime-local"
              value={toLocalInput(e.startsAt)}
              onChange={(x) => set({ startsAt: x.target.value ? `${x.target.value}:00${localOffset(new Date(x.target.value))}` : "" })}
            />
          </label>
        </div>
        <label>
          <span>Why it's happening (the way you'd explain it to your child)</span>
          <input value={e.purpose ?? ""} onChange={(x) => set({ purpose: x.target.value || undefined })} />
        </label>
      </section>

      <section className="card form">
        <h2>People</h2>
        {(["companions", "people"] as const).map((list) => (
          <fieldset key={list}>
            <legend>{list === "companions" ? "Going with your child" : "Meeting there"}</legend>
            {e[list].map((p, i) => (
              <div key={p.id} className="person">
                <div className="row">
                  <input
                    placeholder="Name (Dad, Dr. Patel)"
                    value={p.name}
                    onFocus={() => (nameAtFocus.current = p.name)}
                    onBlur={() => renameInSteps(nameAtFocus.current, p.name)}
                    onChange={(x) => setPerson(list, i, { name: x.target.value })}
                  />
                  <input placeholder="Role (parent, doctor)" value={p.role ?? ""} onChange={(x) => setPerson(list, i, { role: x.target.value || undefined })} />
                  <button className="icon" aria-label="Remove" onClick={() => set({ [list]: e[list].filter((_, n) => n !== i) } as Partial<Event>)}>×</button>
                </div>
                <input placeholder="What they look like (for the pictures)" value={p.appearance ?? ""} onChange={(x) => setPerson(list, i, { appearance: x.target.value || undefined })} />
                {list === "people" && (
                  <input
                    placeholder='A friendly, true fact ("has a fish tank")'
                    value={p.facts.join("; ")}
                    onChange={(x) => setPerson(list, i, { facts: x.target.value.split(";").map((s) => s.trim()).filter(Boolean).slice(0, 3) })}
                  />
                )}
              </div>
            ))}
            <button
              className="small"
              onClick={() => set({ [list]: [...e[list], { id: newId(list === "people" ? "p-" : "c-"), name: "", facts: [] }] } as Partial<Event>)}
            >
              + Add someone
            </button>
          </fieldset>
        ))}
      </section>

      <section className="card form">
        <h2>Steps, in order</h2>
        <p className="muted">Each step becomes a page. Tick "will happen no matter what" for things like a shot, so the story is honest about it.</p>
        <ol className="steps-edit">
          {e.steps.map((s, i) => (
            <li key={s.id}>
              <div className="row">
                <input value={s.description} onChange={(x) => setStep(i, { description: x.target.value })} />
                <button className="icon" disabled={i === 0} onClick={() => moveStep(i, -1)} aria-label="Move up">↑</button>
                <button className="icon" disabled={i === e.steps.length - 1} onClick={() => moveStep(i, 1)} aria-label="Move down">↓</button>
                <button className="icon" disabled={e.steps.length === 1} onClick={() => set({ steps: e.steps.filter((_, n) => n !== i) })} aria-label="Delete step">×</button>
              </div>
              <div className="row step-meta">
                <label className="choice">
                  <input type="checkbox" checked={s.fixed} onChange={(x) => setStep(i, { fixed: x.target.checked })} />
                  <span>Will happen no matter what</span>
                </label>
                {e.places.length > 0 && (
                  <select value={s.placeId ?? ""} onChange={(x) => setStep(i, { placeId: x.target.value || undefined })} aria-label="Where">
                    <option value="">(no particular place)</option>
                    {e.places.map((pl) => <option key={pl.id} value={pl.id}>at {pl.name}</option>)}
                  </select>
                )}
                {everyone.length > 0 && (
                  <span className="chips">
                    {everyone.map((p) => (
                      <button
                        key={p.id}
                        className={s.personIds.includes(p.id) ? "chip on" : "chip"}
                        aria-pressed={s.personIds.includes(p.id)}
                        onClick={() => setStep(i, { personIds: s.personIds.includes(p.id) ? s.personIds.filter((x) => x !== p.id) : [...s.personIds, p.id] })}
                      >
                        {p.name || "?"}
                      </button>
                    ))}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
        <button className="small" onClick={() => set({ steps: [...e.steps, { id: newId("s"), description: "", personIds: [], fixed: false }] })}>+ Add a step</button>
      </section>

      <section className="card form">
        <h2>Places, getting there, and hard parts</h2>
        {e.places.map((pl, i) => (
          <div key={pl.id} className="person">
            <input value={pl.name} onChange={(x) => set({ places: e.places.map((p, n) => (n === i ? { ...p, name: x.target.value } : p)) })} />
            <textarea
              rows={2}
              placeholder="What it's like: noisy, bright, smells like soap (one per line)"
              value={pl.sensoryNotes.join("\n")}
              onChange={(x) => set({ places: e.places.map((p, n) => (n === i ? { ...p, sensoryNotes: lines(x.target.value) } : p)) })}
            />
          </div>
        ))}
        <button className="small" onClick={() => set({ places: [...e.places, { id: newId("pl-"), name: "", photos: [], sensoryNotes: [] }] })}>+ Add a place</button>
        <div className="row">
          <label>
            <span>Getting there</span>
            <select
              value={e.transport?.mode ?? ""}
              onChange={(x) =>
                set({ transport: x.target.value ? { mode: x.target.value as "car", name: e.transport?.name ?? `the ${x.target.value}`, appearance: e.transport?.appearance } : undefined })
              }
            >
              <option value="">Not set</option>
              {["car", "bus", "train", "walk", "other"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          {e.transport && e.transport.mode !== "walk" && (
            <>
              <label>
                <span>Called</span>
                <input value={e.transport.name} onChange={(x) => set({ transport: { ...e.transport!, name: x.target.value } })} />
              </label>
              <label>
                <span>Looks like</span>
                <input value={e.transport.appearance ?? ""} onChange={(x) => set({ transport: { ...e.transport!, appearance: x.target.value || undefined } })} />
              </label>
            </>
          )}
        </div>
        <label>
          <span>What will be hard (one per line)</span>
          <textarea rows={3} value={hard} onChange={(x) => { setHard(x.target.value); setDirty(true); }} />
        </label>
        <label>
          <span>Anything else about the day</span>
          <textarea rows={2} value={e.notes ?? ""} onChange={(x) => set({ notes: x.target.value || undefined })} />
        </label>
      </section>

      {error && <p className="note bad">{error}</p>}
      <div className="toolbar bottom">
        <span className="status">{busy ?? (dirty ? "Unsaved changes" : saved ? "Saved" : "Not saved yet")}</span>
        <button onClick={() => void save()} disabled={!!busy || (saved && !dirty)}>Save outline</button>
        {hasStory && onOpenStory && <button onClick={onOpenStory} disabled={!!busy}>Open the story</button>}
        <button className={hasStory ? "" : "primary"} onClick={() => void write()} disabled={!!busy}>
          {hasStory ? "Write the story again" : "Write the story now"}
        </button>
      </div>

      {saved && photos && (
        <section className="card form photo-section" id="photos">
          <h2>Photos that would help{e.title ? `: ${e.title}` : ""}</h2>
          <p className="muted">
            Gather these whenever you can; every one is optional. You can write the story now and add photos later, or come back
            once you have them. This list stays here, and you can take it with you:
          </p>
          <div className="keep-list no-print">
            <button onClick={printList}>🖨 Print or save as PDF</button>
            <a className="button" href={`mailto:?subject=${encodeURIComponent(`Photos for ${e.title}`)}&body=${encodeURIComponent(listText())}`}>
              ✉ Email it to me
            </a>
            <button onClick={() => void copyList()}>{copied ? "Copied" : "Copy the list"}</button>
            {"share" in navigator && <button onClick={() => void shareList()}>Share…</button>}
          </div>
          <PhotoList title="Most helpful" items={most} />
          {nice.length > 0 && <PhotoList title="Nice to have" items={nice} />}
          <ul className="tips">{photos.generalTips.map((t) => <li key={t}>{t}</li>)}</ul>
          <button className="no-print" onClick={onDone}>I'll come back with photos</button>
        </section>
      )}
    </main>
  );
}

function PhotoList({ title, items }: { title: string; items: PhotoChecklist["items"] }) {
  return (
    <fieldset>
      <legend>{title}</legend>
      <ul className="photo-todo">
        {items.map((p) => (
          <li key={p.id}>
            <span className="box" aria-hidden="true">☐</span>
            <strong>{p.label}</strong>
            <span className="muted"> {p.why}</span>
            {p.tip && <small> {p.tip}</small>}
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
