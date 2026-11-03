import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PageDraft,
  Story,
  buildPageRewritePrompt,
  castFor,
  draftToPage,
  pageFingerprint,
  sampleEvents,
  samplePlayer,
  type DetailLevel,
  type Event,
  type PlayerProfile,
  type ReadingLevel,
  type StoryPage,
} from "@socialstory/core";
import { loadKit, pageFile, readDrawnFrom, writeDrawnFrom } from "./kits.js";
import { DATA_DIR, imagesDir, storiesDir } from "./paths.js";
import { loadPlayer } from "./players.js";
import { loadEvent } from "./events.js";

/**
 * Drafts: a written story plus its pictures, before publishing. This is what
 * the user edits. Stories live in .data/stories/<id>.json and pictures in
 * .data/images/<id>/ (the database replaces both after the hackathon).
 *
 * The one tricky rule: a picture belongs to its page, not to a page number.
 * When pages are reordered, added or deleted, saveDraft renames the picture
 * files to follow their pages, and moves pictures of deleted pages to
 * history/ (never deletes them).
 */

/** Who the story is for. One fake family until accounts exist. */
export function draftContext(id: string, dataDir = DATA_DIR): { event: Event; player: PlayerProfile } | undefined {
  // Events the user made come first; the sample events are always there too.
  const event = loadEvent(id, dataDir) ?? sampleEvents[id];
  if (!event) return undefined;
  return { event, player: loadPlayer(event.playerId, dataDir) ?? samplePlayer };
}

const ID = /^[a-z0-9-]+$/;
const storyFile = (id: string, dataDir: string) => resolve(storiesDir(dataDir), `${id}.json`);

export function listDrafts(dataDir = DATA_DIR): string[] {
  const dir = storiesDir(dataDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5))
    .filter((id) => ID.test(id) && draftContext(id, dataDir));
}

export function loadStory(id: string, dataDir = DATA_DIR): Story | undefined {
  if (!ID.test(id)) return undefined;
  const file = storyFile(id, dataDir);
  if (!existsSync(file)) return undefined;
  const saved = JSON.parse(readFileSync(file, "utf8"));
  const parsed = Story.safeParse(saved?.story);
  return parsed.success ? parsed.data : undefined;
}

export interface DraftView {
  id: string;
  story: Story;
  event: { title: string; startsAt: string };
  player: { name: string; readingLevel: ReadingLevel; detailLevel: DetailLevel };
  cast: Array<{ id: string; name: string; kind: "person" | "prop" }>;
  /** Picture file -> last-modified time (for cache-busting URLs). */
  pictures: Record<string, number>;
  /** Picture file -> fingerprint of the page content it was drawn from. */
  drawnFrom: Record<string, string>;
  /** On the child's shelf: when, and whether the shelf has exactly these words. */
  published?: { at: string; current: boolean };
}

/** The words of a story, for comparing the saved draft with what's on the shelf. */
const wordsOf = (title: string, pages: Array<{ sentences: Array<{ text: string }> }>) =>
  JSON.stringify([title.trim(), pages.map((p) => p.sentences.map((s) => s.text.trim()))]);

export function loadDraft(id: string, dataDir = DATA_DIR): DraftView | undefined {
  const story = loadStory(id, dataDir);
  const ctx = draftContext(id, dataDir);
  if (!story || !ctx) return undefined;
  const dir = imagesDir(id, dataDir);
  const pictures: Record<string, number> = {};
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      if (/^(page-\d{2}|cast-[a-z0-9-]+)\.png$/.test(f)) pictures[f] = Math.round(statSync(resolve(dir, f)).mtimeMs);
    }
  }
  return {
    id,
    story,
    event: { title: ctx.event.title, startsAt: ctx.event.startsAt },
    player: { name: ctx.player.displayName, readingLevel: ctx.player.readingLevel, detailLevel: ctx.player.detailLevel },
    cast: castFor(ctx.event, ctx.player).map((m) => ({ id: m.id, name: m.name, kind: m.kind })),
    pictures,
    drawnFrom: readDrawnFrom(id, dataDir).pages,
    published: (() => {
      const kit = loadKit(id, dataDir);
      return kit ? { at: kit.publishedAt, current: wordsOf(kit.title, kit.pages) === wordsOf(story.title, story.pages) } : undefined;
    })(),
  };
}

function stamp(d = new Date()) {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}_${two(d.getHours())}-${two(d.getMinutes())}-${two(d.getSeconds())}`;
}

/**
 * Saves an edited story. `origins[i]` says which page (by index in the story
 * as it was last saved) new page i came from, or null for a new page.
 * Each page's picture follows it; pictures of deleted pages go to history.
 */
export function saveDraft(
  id: string,
  input: { story: unknown; origins: Array<number | null> },
  dataDir = DATA_DIR,
): Story {
  if (!ID.test(id) || !draftContext(id, dataDir)) throw new Error("Unknown story");
  const story = Story.parse(input.story);
  const { origins } = input;
  if (origins.length !== story.pages.length) throw new Error("origins must have one entry per page");
  const used = origins.filter((o): o is number => o !== null);
  if (new Set(used).size !== used.length) throw new Error("A page can only come from one place");

  const file = storyFile(id, dataDir);
  const previous = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  const time = stamp();

  // Keep the old version of the words, too.
  if (existsSync(file)) {
    const historyDir = resolve(storiesDir(dataDir), "history");
    mkdirSync(historyDir, { recursive: true });
    writeFileSync(resolve(historyDir, `${id}_${time}.json`), readFileSync(file));
  }

  // Move every page picture aside, then put each one back under its page's new number.
  const dir = imagesDir(id, dataDir);
  if (existsSync(dir)) {
    const drawn = readDrawnFrom(id, dataDir);
    const holding = resolve(dir, `.moving-${time}`);
    mkdirSync(holding, { recursive: true });
    const before = readdirSync(dir).filter((f) => /^page-\d{2}\.png$/.test(f));
    for (const f of before) renameSync(resolve(dir, f), resolve(holding, f));

    const newDrawn: Record<string, string> = {};
    origins.forEach((origin, i) => {
      if (origin === null) return;
      const from = pageFile(origin);
      if (!existsSync(resolve(holding, from))) return;
      renameSync(resolve(holding, from), resolve(dir, pageFile(i)));
      if (drawn.pages[from]) newDrawn[pageFile(i)] = drawn.pages[from];
    });

    // Whatever is left belonged to deleted pages: archive, never delete.
    const leftovers = readdirSync(holding);
    if (leftovers.length) {
      const historyDir = resolve(dir, "history", time);
      mkdirSync(historyDir, { recursive: true });
      for (const f of leftovers) renameSync(resolve(holding, f), resolve(historyDir, f));
    }
    rmdirSync(holding); // empty by now
    writeDrawnFrom(id, { pages: { ...Object.fromEntries(Object.entries(drawn.pages).filter(([k]) => !k.startsWith("page-"))), ...newDrawn } }, dataDir);
  }

  writeFileSync(file, JSON.stringify({ ...previous, story, editedAt: new Date().toISOString() }, null, 2));
  return story;
}

/** "Keep this picture": the user says it still fits the page's new words. */
export function keepPicture(id: string, pageIndex: number, dataDir = DATA_DIR) {
  const story = loadStory(id, dataDir);
  const page = story?.pages[pageIndex];
  if (!page) throw new Error("No such page");
  const drawn = readDrawnFrom(id, dataDir);
  drawn.pages[pageFile(pageIndex)] = pageFingerprint(page);
  writeDrawnFrom(id, drawn, dataDir);
}

/** Writes one page again with Spark. Returns the new page; the caller decides whether to keep it. */
export type RewritePage = (prompt: { instructions: string; input: string }) => Promise<PageDraft>;

export async function rewritePage(
  id: string,
  args: { story: unknown; pageIndex: number; note?: string },
  generate: RewritePage,
): Promise<StoryPage> {
  const ctx = draftContext(id);
  if (!ctx) throw new Error("Unknown story");
  const story = Story.parse(args.story);
  const prompt = buildPageRewritePrompt(ctx.event, ctx.player, story, args.pageIndex, args.note?.slice(0, 300));
  const page = draftToPage(await generate(prompt));
  // The section and step stay put, whatever the model returns.
  const original = story.pages[args.pageIndex]!;
  return { ...page, section: original.section, stepId: original.stepId };
}
