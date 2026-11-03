import { useEffect, useRef, useState } from "react";
import { players } from "./playersApi";
import { ABOUT_ME_KIND, photoLetter, photoListText, type Event, type PhotoLetter, type PhotoRef, type PlayerProfile, type PhotoChecklist, type Person, type Step } from "@socialstory/core";
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
  const aboutMe = e.kind === ABOUT_ME_KIND;
  const [saved, setSaved] = useState(initial.id !== "new");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [photos, setPhotos] = useState<PhotoChecklist>();
  const [hard, setHard] = useState(initial.hardParts.map((h) => h.description).join("\n"));

  // The child's profile holds their comfort-item photos (shared by every story).
  const [child, setChild] = useState<PlayerProfile>();
  const [photoBusy, setPhotoBusy] = useState<string>();
  const [photoNote, setPhotoNote] = useState<string>();
  const refresh = () => {
    if (e.id === "new") return;
    events.photos(e.id).then(setPhotos).catch(() => {});
    players.load(e.playerId).then(setChild).catch(() => {});
  };
  useEffect(() => {
    if (saved) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, e.id]);

  async function addPhoto(itemId: string, file: File) {
    // The server answers with the saved event, so save outline edits first or they'd be lost.
    if (dirty && !(await save())) return;
    setPhotoBusy(itemId);
    setPhotoNote(undefined);
    try {
      const r = await events.addPhoto(e.id, itemId, file);
      setE(r.event);
      setPhotoNote(
        r.cutout === "made"
          ? "Added. SAM 3.1 cut them out of the photo: that cutout is what the pictures will be drawn from."
          : r.cutout === "not-found"
            ? "Added. SAM couldn't find them clearly in this photo, so the whole photo will be used. A closer, plainer photo cuts out better."
            : r.cutout === "failed"
              ? "Added. The cutout didn't work this time, so the whole photo will be used."
              : "Added.",
      );
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPhotoBusy(undefined);
    }
  }
  async function removePhoto(itemId: string) {
    if (dirty && !(await save())) return;
    setPhotoBusy(itemId);
    try {
      setE((await events.removePhoto(e.id, itemId)).event);
      refresh();
    } finally {
      setPhotoBusy(undefined);
    }
  }
  async function setPlan(itemId: string, plan: string | null) {
    if (dirty && !(await save())) return;
    setE((await events.setPlan(e.id, itemId, plan)).event);
  }

  /** Every photo added so far, with a name for each. */
  const added: Array<{ id: string; label: string; photo: PhotoRef }> = [
    ...[...e.companions, ...e.people].filter((p) => p.photo).map((p) => ({ id: p.photo!.id, label: p.name, photo: p.photo! })),
    ...e.places.flatMap((pl) =>
      pl.photos.map((ph) => ({ id: ph.id, label: ph.id.endsWith("-entrance") ? `${pl.name}: outside` : ph.id.endsWith("-inside") ? `${pl.name}: inside` : ph.id.replace(/^extra-/, "").replace(/-/g, " "), photo: ph })),
    ),
    ...[...(child?.comforts ?? []), ...e.comforts].filter((c) => c.photo).map((c) => ({ id: c.photo!.id, label: c.name, photo: c.photo! })),
  ];

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
  /** Prints just one part of the page: the photo checklist or the letter. */
  function printOnly(what: "print-photos" | "print-letter") {
    document.body.classList.add(what);
    const done = () => {
      document.body.classList.remove(what);
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.print();
  }
  const printList = () => printOnly("print-photos");
  const [letterOpen, setLetterOpen] = useState(false);
  const [letterBig, setLetterBig] = useState(false);

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
      {aboutMe && (
        <p className="hint">
          This is an "All about me" story: just your child and their own things, with nothing to get ready for. So there's no
          date, no other people, no places and nothing hard here. Those belong in stories about events.
        </p>
      )}

      <section className="card form">
        <label>
          <span>What it's called</span>
          <input value={e.title} onChange={(x) => set({ title: x.target.value })} />
        </label>
        {!aboutMe && <div className="row">
          <label>
            <span>When</span>
            <input
              type="datetime-local"
              value={toLocalInput(e.startsAt)}
              onChange={(x) => set({ startsAt: x.target.value ? `${x.target.value}:00${localOffset(new Date(x.target.value))}` : "" })}
            />
          </label>
        </div>}
        <label>
          <span>Why it's happening (the way you'd explain it to your child)</span>
          <input value={e.purpose ?? ""} onChange={(x) => set({ purpose: x.target.value || undefined })} />
        </label>
      </section>

      {!aboutMe && (
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
      )}

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
                {!aboutMe && (
                  <label className="choice">
                    <input type="checkbox" checked={s.fixed} onChange={(x) => setStep(i, { fixed: x.target.checked })} />
                    <span>Will happen no matter what</span>
                  </label>
                )}
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
        <h2>{aboutMe ? "Anything else" : "Places, getting there, and hard parts"}</h2>
        {!aboutMe && (
          <>
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
          </>
        )}
        <label>
          <span>{aboutMe ? "Anything else true about your child" : "Anything else about the day"}</span>
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
            {!aboutMe && <button onClick={() => setLetterOpen(true)}>📄 Letter to show staff</button>}
          </div>
          {photoNote && <p className="note good no-print">{photoNote}</p>}
          {added.length > 0 && (
            <fieldset className="no-print">
              <legend>Added</legend>
              <ul className="added">
                {added.map((a) => (
                  <li key={a.id}>
                    <img src={`/api/photos/${a.photo.src}`} alt={a.label} />
                    {a.photo.cutout && (
                      <figure className="cutout">
                        <img src={`/api/photos/${a.photo.cutout}`} alt={`${a.label}, cut out`} />
                        <figcaption>Cut out by SAM 3.1</figcaption>
                      </figure>
                    )}
                    <span>{a.label}</span>
                    <button className="small" onClick={() => void removePhoto(a.id)} disabled={photoBusy === a.id}>Remove</button>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
          <PhotoList title="Most helpful" items={most} plans={e.photoPlans} busy={photoBusy} onAdd={addPhoto} onPlan={setPlan} />
          {nice.length > 0 && <PhotoList title="Nice to have" items={nice} plans={e.photoPlans} busy={photoBusy} onAdd={addPhoto} onPlan={setPlan} />}
          <ul className="tips">{photos.generalTips.map((t) => <li key={t}>{t}</li>)}</ul>
          <button className="no-print" onClick={onDone}>I'll come back with photos</button>
        </section>
      )}

      {saved && photos && letterOpen && (
        <LetterView
          letter={photoLetter(e, childName ?? "", photos)}
          big={letterBig}
          onBig={setLetterBig}
          onPrint={() => printOnly("print-letter")}
          onClose={() => setLetterOpen(false)}
        />
      )}
    </main>
  );
}

/**
 * The letter to print or hold up at the front desk. Phone view makes the
 * text big enough to read from across a counter.
 */
function LetterView({
  letter,
  big,
  onBig,
  onPrint,
  onClose,
}: {
  letter: PhotoLetter;
  big: boolean;
  onBig: (v: boolean) => void;
  onPrint: () => void;
  onClose: () => void;
}) {
  return (
    <section className={big ? "card letter-section big" : "card letter-section"} id="letter">
      <div className="keep-list no-print">
        <button onClick={onPrint}>🖨 Print or save as PDF</button>
        <button onClick={() => onBig(!big)}>{big ? "Normal size" : "📱 Phone view (big text)"}</button>
        <button onClick={onClose}>Close</button>
      </div>
      <h2>{letter.title}</h2>
      {letter.opening.map((p) => <p key={p}>{p}</p>)}
      <h3>{letter.promisesTitle}</h3>
      <ul>{letter.promises.map((p) => <li key={p}>{p}</li>)}</ul>
      <h3>{letter.askTitle}</h3>
      <ul>{letter.asks.map((p) => <li key={p}>{p}</li>)}</ul>
      {letter.closing.map((p) => <p key={p}>{p}</p>)}
      <p className="signature">Name: ____________________ &nbsp; Phone (optional): ________________</p>
    </section>
  );
}

const PLAN_LABELS: Record<string, string> = {
  describe: "Draw it from my description",
  generic: "Use a simple, generic drawing",
  "leave-out": "Leave it out of the pictures",
  "at-event": "I'll take it at the event",
};

function PhotoList({
  title,
  items,
  plans,
  busy,
  onAdd,
  onPlan,
}: {
  title: string;
  items: PhotoChecklist["items"];
  plans: Record<string, string>;
  busy?: string;
  onAdd: (itemId: string, file: File) => void;
  onPlan: (itemId: string, plan: string | null) => void;
}) {
  return (
    <fieldset>
      <legend>{title}</legend>
      <ul className="photo-todo">
        {items.map((p) => (
          <li key={p.id}>
            <div>
              <span className="box" aria-hidden="true">☐</span>
              <strong>{p.label}</strong>
              <span className="muted"> {p.why}</span>
              {p.tip && <small> {p.tip}</small>}
            </div>
            <div className="todo-actions no-print">
              <label className={busy === p.id ? "button disabled" : "button"}>
                {busy === p.id ? "Adding…" : "📷 Add photo"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={!!busy}
                  onChange={(x) => {
                    const f = x.target.files?.[0];
                    if (f) onAdd(p.id, f);
                    x.target.value = "";
                  }}
                />
              </label>
              <select value={plans[p.id] ?? ""} onChange={(x) => onPlan(p.id, x.target.value || null)} aria-label="If you can't get this photo">
                <option value="">Can't get it?</option>
                {Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
