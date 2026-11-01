import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  SentenceType,
  pictureOutOfDate,
  readability,
  READING_LIMITS,
  READING_LEVEL_LABELS,
  DETAIL_LEVEL_LABELS,
  type Story,
  validateStory,
  type Issue,
  type StorySection,
} from "@socialstory/core";
import { api, type DraftView, type PublishResult } from "./api";
import {
  TYPE_HELP,
  TYPE_LABELS,
  fromPage,
  newKey,
  toEdit,
  toPage,
  toStory,
  type EditPage,
  type EditSentence,
  type EditStory,
} from "./model";

const pageFile = (i: number) => `page-${String(i + 1).padStart(2, "0")}.png`;
const SECTION_LABELS: Record<StorySection, string> = {
  introduction: "Introduction",
  body: "Middle",
  conclusion: "Ending",
};

/**
 * The story editor (design doc: "Review and edit pass").
 * Every word is editable; sentences and pages move freely; nothing here
 * costs anything except "Rewrite this page". The checker only warns.
 */
export function Editor({ id, onBack, onOutline }: { id: string; onBack: () => void; onOutline?: () => void }) {
  const [draft, setDraft] = useState<DraftView>();
  const [edit, setEdit] = useState<EditStory>();
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [published, setPublished] = useState<PublishResult>();
  const [confirmRegenerate, setConfirmRegenerate] = useState<boolean>();

  function load(view: DraftView) {
    setDraft(view);
    setEdit(toEdit(view.story));
    setDirty(false);
  }

  useEffect(() => {
    api.load(id).then(load).catch((e: Error) => setError(e.message));
  }, [id]);

  // Don't lose edits by closing the tab.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const story = useMemo(() => (edit ? toStory(edit) : undefined), [edit]);
  const check = useMemo(
    () =>
      story && draft ? validateStory(story, { cast: draft.cast, readingLevel: draft.player.readingLevel }) : undefined,
    [story, draft],
  );
  const emptyPage = edit?.pages.findIndex((p) => !p.sentences.some((s) => s.text.trim())) ?? -1;

  if (error && !edit) return <main className="page"><p className="bad">{error}</p></main>;
  if (!draft || !edit || !story || !check) return <main className="page"><p className="muted">Loading…</p></main>;

  const update = (fn: (s: EditStory) => EditStory) => {
    setEdit((s) => (s ? fn(s) : s));
    setDirty(true);
    setPublished(undefined);
  };
  const updatePage = (key: string, fn: (p: EditPage) => EditPage) =>
    update((s) => ({ ...s, pages: s.pages.map((p) => (p.key === key ? fn(p) : p)) }));

  async function run<T>(label: string, task: () => Promise<T>): Promise<T | undefined> {
    setBusy(label);
    setError(undefined);
    try {
      return await task();
    } catch (e) {
      setError((e as Error).message);
      return undefined;
    } finally {
      setBusy(undefined);
    }
  }

  /** Saves if needed. Returns false if saving isn't possible yet. */
  async function save(): Promise<boolean> {
    if (!dirty) return true;
    if (emptyPage >= 0) {
      setError(`Page ${emptyPage + 1} has no words. Add a sentence or delete the page first.`);
      return false;
    }
    const view = await run("Saving…", () => api.save(id, story!, edit!.pages.map((p) => p.origin)));
    if (view) load(view);
    return !!view;
  }

  async function keep(index: number) {
    if (!(await save())) return;
    const view = await run("Keeping the picture…", () => api.keep(id, index));
    if (view) load(view);
  }

  async function rewrite(page: EditPage, index: number, note: string) {
    const fresh = await run(`Rewriting page ${index + 1}…`, () => api.rewrite(id, story!, index, note));
    if (fresh) {
      const next = fromPage(fresh, page.origin);
      updatePage(page.key, () => ({ ...next, key: page.key }));
    }
  }

  async function regenerate(care: boolean) {
    setConfirmRegenerate(undefined);
    const view = await run(
      care ? "Writing a new version, taking more care (about 30 seconds)…" : "Writing a new version (about 10 seconds)…",
      () => api.regenerate(id, care),
    );
    if (view) load(view);
  }

  async function publish() {
    if (!(await save())) return;
    const result = await run("Publishing…", () => api.publish(id));
    if (result) setPublished(result);
  }

  const issuesFor = (i: number) => check.issues.filter((x) => x.page === i);
  const storyIssues = check.issues.filter((x) => x.page === undefined);

  return (
    <main className="page wide">
      <header className="editor-head">
        <div className="row">
          <button className="link" onClick={onBack}>← All stories</button>
          {onOutline && (
            <button className="link" onClick={onOutline}>Outline and photo list</button>
          )}
        </div>
        <label className="title-label" htmlFor="story-title">Story title ✎</label>
        <input
          id="story-title"
          className="title-input"
          value={edit.title}
          onChange={(e) => update((s) => ({ ...s, title: e.target.value }))}
        />
        <p className="muted">
          For "{draft.event.title}". Change any word, drag sentences (⠿) to move them, even onto another page.
          Moving things around is free.
        </p>
      </header>

      <div className="toolbar">
        <span className={dirty ? "status unsaved" : "status"}>{busy ?? (dirty ? "Unsaved changes" : "All changes saved")}</span>
        <button onClick={() => setConfirmRegenerate(false)} disabled={!!busy}>Write it again</button>
        <button onClick={() => setConfirmRegenerate(true)} disabled={!!busy}>Take more care</button>
        <button onClick={save} disabled={!dirty || !!busy}>Save</button>
        <button className="primary" onClick={publish} disabled={!!busy}>Publish to the shelf</button>
      </div>

      {confirmRegenerate !== undefined && (
        <div className="note">
          <p>
            {confirmRegenerate
              ? "Write a whole new story, taking more care (about 30 seconds)."
              : "Write a whole new story (about 10 seconds)."}{" "}
            This replaces every page, including your edits. Your current version is kept in history, and the pictures stay
            until you redraw them.
          </p>
          <button className="primary" onClick={() => regenerate(confirmRegenerate)}>Write the new version</button>{" "}
          <button onClick={() => setConfirmRegenerate(undefined)}>Cancel</button>
        </div>
      )}
      {error && <p className="note bad">{error}</p>}
      {published && (
        <div className="note good">
          Published. Your child's shelf now has this version.
          {published.warnings.length > 0 && (
            <ul>{published.warnings.map((w, i) => <li key={i}>{w.page !== undefined ? `Page ${w.page + 1}: ` : ""}{w.message}</li>)}</ul>
          )}
        </div>
      )}

      <Checker issues={storyIssues} stats={check.stats} story={story} player={draft.player} />

      <Pages
        edit={edit}
        update={update}
        render={(page, index, list) => (
          <PageCard
            key={page.key}
            id={id}
            page={page}
            index={index}
            count={edit.pages.length}
            draft={draft}
            issues={issuesFor(index)}
            busy={!!busy}
            list={list}
            onChange={(fn) => updatePage(page.key, fn)}
            onMove={(delta) =>
              update((s) => ({ ...s, pages: arrayMove(s.pages, index, index + delta) }))
            }
            onDelete={() => update((s) => ({ ...s, pages: s.pages.filter((p) => p.key !== page.key) }))}
            onAddBelow={() =>
              update((s) => {
                const pages = [...s.pages];
                pages.splice(index + 1, 0, {
                  key: newKey("page"),
                  origin: null,
                  section: "body",
                  inPicture: [],
                  sentences: [{ key: newKey("s"), text: "", type: "descriptive" }],
                });
                return { ...s, pages };
              })
            }
            onKeep={() => keep(index)}
            onRewrite={(note) => rewrite(page, index, note)}
          />
        )}
      />
    </main>
  );
}

/** Story-wide notes, plus the describing-to-choices balance. */
function Checker({
  issues,
  stats,
  story,
  player,
}: {
  issues: Issue[];
  stats: { describing: number; coaching: number };
  story: Story;
  player: DraftView["player"];
}) {
  const balanced = stats.coaching === 0 || stats.describing >= stats.coaching * 2;
  const limits = READING_LIMITS[player.readingLevel];
  const estimate = readability(story);
  return (
    <section className="card checker">
      <p>
        <strong>Written for {player.name}:</strong> {READING_LEVEL_LABELS[player.readingLevel]} (up to{" "}
        {limits.maxSentencesPerPage} sentence{limits.maxSentencesPerPage === 1 ? "" : "s"} a page, {limits.maxWords} words
        each) · {DETAIL_LEVEL_LABELS[player.detailLevel]} detail
      </p>
      <p className="muted-line">
        Reads at {estimate.label}. A rough guide only: short stories make any reading formula shaky, and it measures the
        words, not understanding.
      </p>
      <p>
        <strong>Balance:</strong> {stats.describing} describing, {stats.coaching} choices{" "}
        <span className={balanced ? "good" : "warn"}>
          {balanced ? "(good: at least 2 to 1)" : "(Social Stories describe at least twice as much as they suggest)"}
        </span>
      </p>
      {issues.map((i, n) => <p key={n} className="warn">⚠ {i.message}</p>)}
    </section>
  );
}

/** Drag-and-drop for sentences, within a page or across pages. */
function Pages({
  edit,
  update,
  render,
}: {
  edit: EditStory;
  update: (fn: (s: EditStory) => EditStory) => void;
  render: (page: EditPage, index: number, list: ReactNode) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const pageOf = (s: EditStory, id: string) =>
    s.pages.find((p) => p.key === id || p.sentences.some((x) => x.key === id));

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    update((s) => {
      const from = pageOf(s, String(active.id));
      const to = pageOf(s, String(over.id));
      if (!from || !to || from.key === to.key) return s;
      const moving = from.sentences.find((x) => x.key === active.id)!;
      const at = to.sentences.findIndex((x) => x.key === over.id);
      return {
        ...s,
        pages: s.pages.map((p) => {
          if (p.key === from.key) return { ...p, sentences: p.sentences.filter((x) => x.key !== active.id) };
          if (p.key === to.key) {
            const sentences = [...p.sentences];
            sentences.splice(at < 0 ? sentences.length : at, 0, moving);
            return { ...p, sentences };
          }
          return p;
        }),
      };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    update((s) => {
      const page = pageOf(s, String(active.id));
      if (!page) return s;
      const from = page.sentences.findIndex((x) => x.key === active.id);
      const to = page.sentences.findIndex((x) => x.key === over.id);
      if (from < 0 || to < 0) return s;
      return {
        ...s,
        pages: s.pages.map((p) => (p.key === page.key ? { ...p, sentences: arrayMove(p.sentences, from, to) } : p)),
      };
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      // No text selection while dragging (it highlighted the whole page).
      onDragStart={() => document.body.classList.add("dragging-sentence")}
      onDragCancel={() => document.body.classList.remove("dragging-sentence")}
      onDragOver={onDragOver}
      onDragEnd={(e) => {
        document.body.classList.remove("dragging-sentence");
        onDragEnd(e);
      }}
    >
      {edit.pages.map((page, index) =>
        render(
          page,
          index,
          <SentenceList page={page} onChange={(fn) => update((s) => ({ ...s, pages: s.pages.map((p) => (p.key === page.key ? fn(p) : p)) }))} />,
        ),
      )}
    </DndContext>
  );
}

function SentenceList({ page, onChange }: { page: EditPage; onChange: (fn: (p: EditPage) => EditPage) => void }) {
  const { setNodeRef } = useDroppable({ id: page.key });
  const setSentence = (key: string, patch: Partial<EditSentence>) =>
    onChange((p) => ({ ...p, sentences: p.sentences.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));
  return (
    <SortableContext items={page.sentences.map((s) => s.key)} strategy={verticalListSortingStrategy}>
      <ol className="sentences" ref={setNodeRef}>
        {page.sentences.map((s) => (
          <SentenceRow
            key={s.key}
            sentence={s}
            onText={(text) => setSentence(s.key, { text })}
            onType={(type) => setSentence(s.key, { type })}
            onDelete={() => onChange((p) => ({ ...p, sentences: p.sentences.filter((x) => x.key !== s.key) }))}
          />
        ))}
        {page.sentences.length === 0 && <li className="drop-here">Drop a sentence here, or add one.</li>}
      </ol>
      <button
        className="small"
        onClick={() => onChange((p) => ({ ...p, sentences: [...p.sentences, { key: newKey("s"), text: "", type: "descriptive" }] }))}
      >
        + Add a sentence
      </button>
    </SortableContext>
  );
}

function SentenceRow({
  sentence,
  onText,
  onType,
  onDelete,
}: {
  sentence: EditSentence;
  onText: (t: string) => void;
  onType: (t: SentenceType) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sentence.key });
  return (
    <li
      ref={setNodeRef}
      className={isDragging ? "sentence dragging" : "sentence"}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button className="handle" aria-label="Drag to move this sentence" {...attributes} {...listeners}>⠿</button>
      <textarea
        value={sentence.text}
        rows={1}
        placeholder="Write a sentence…"
        aria-label="Sentence"
        onChange={(e) => onText(e.target.value)}
      />
      <select
        value={sentence.type}
        aria-label="Kind of sentence"
        title={TYPE_HELP[sentence.type]}
        onChange={(e) => onType(e.target.value as SentenceType)}
      >
        {SentenceType.options.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
      </select>
      <button className="icon" aria-label="Delete this sentence" onClick={onDelete}>×</button>
    </li>
  );
}

function PageCard(props: {
  id: string;
  page: EditPage;
  index: number;
  count: number;
  draft: DraftView;
  issues: Issue[];
  busy: boolean;
  list: ReactNode;
  onChange: (fn: (p: EditPage) => EditPage) => void;
  onMove: (delta: number) => void;
  onDelete: () => void;
  onAddBelow: () => void;
  onKeep: () => void;
  onRewrite: (note: string) => void;
}) {
  const { id, page, index, count, draft, issues, busy, list, onChange } = props;
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showRewrite, setShowRewrite] = useState(false);

  // A page's picture is the one drawn for the saved page it came from.
  const file = page.origin === null ? undefined : pageFile(page.origin);
  const version = file ? draft.pictures[file] : undefined;
  const drawnFor = file ? draft.drawnFrom[file] : undefined;
  const stale = !!version && pictureOutOfDate(drawnFor, toPage(page));

  return (
    <section className="card page-card">
      <div className="page-head">
        <strong>Page {index + 1}</strong>
        <select
          value={page.section}
          aria-label="Part of the story"
          onChange={(e) => onChange((p) => ({ ...p, section: e.target.value as StorySection }))}
        >
          {(["introduction", "body", "conclusion"] as const).map((s) => <option key={s} value={s}>{SECTION_LABELS[s]}</option>)}
        </select>
        <span className="spacer" />
        <button className="small" onClick={() => setShowRewrite((v) => !v)} disabled={busy}>✎ Rewrite this page…</button>
        <button className="icon" onClick={() => props.onMove(-1)} disabled={index === 0} aria-label="Move page up">↑</button>
        <button className="icon" onClick={() => props.onMove(1)} disabled={index === count - 1} aria-label="Move page down">↓</button>
        {confirmDelete ? (
          <>
            <button className="small danger" onClick={props.onDelete}>Delete page</button>
            <button className="small" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </>
        ) : (
          <button className="icon" onClick={() => setConfirmDelete(true)} aria-label="Delete this page">🗑</button>
        )}
      </div>

      {showRewrite && (
        <div className="rewrite-row">
          <input
            className="note-input"
            autoFocus
            placeholder='Optional note, e.g. "mention the fish more"'
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (props.onRewrite(note), setShowRewrite(false))}
          />
          <button className="primary" onClick={() => { props.onRewrite(note); setShowRewrite(false); }} disabled={busy}>
            Rewrite
          </button>
          <button onClick={() => setShowRewrite(false)}>Cancel</button>
          <p className="muted small-note">Only this page changes. About 5 seconds. Your note guides the writer but can't add facts the event doesn't have.</p>
        </div>
      )}

      <div className="page-body">
        <div className="thumb">
          {version ? (
            <img src={api.imageUrl(id, file!, version)} alt={page.sceneBrief ?? ""} />
          ) : (
            <div className="no-picture">No picture yet</div>
          )}
          {stale && (
            <div className="stale">
              <span>The picture description or who's in it changed since this was drawn. It may not match.</span>
              <button className="small" onClick={props.onKeep} disabled={busy}>Keep it</button>
            </div>
          )}
        </div>

        <div className="page-words">
          {list}
          <label className="brief">
            <span>The picture shows</span>
            <input
              value={page.sceneBrief ?? ""}
              onChange={(e) => onChange((p) => ({ ...p, sceneBrief: e.target.value }))}
            />
          </label>
          <div className="chips" aria-label="Who's in the picture">
            {draft.cast.map((m) => (
              <button
                key={m.id}
                className={page.inPicture.includes(m.id) ? "chip on" : "chip"}
                aria-pressed={page.inPicture.includes(m.id)}
                onClick={() =>
                  onChange((p) => ({
                    ...p,
                    inPicture: p.inPicture.includes(m.id) ? p.inPicture.filter((x) => x !== m.id) : [...p.inPicture, m.id],
                  }))
                }
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {issues.map((i, n) => <p key={n} className="warn">⚠ {i.message}</p>)}

      <div className="page-actions">
        <button className="small" onClick={props.onAddBelow}>+ Add a page below</button>
      </div>
    </section>
  );
}
