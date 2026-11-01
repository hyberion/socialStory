/**
 * `pnpm draw-story [event] [--new-cast] [--pages 1,3]` from the repo root.
 *
 * Illustrates a story written by `pnpm write-story <event>`:
 *   1. Draws a reference portrait of each cast member (the "cast sheet").
 *   2. Draws each page, attaching the portraits of whoever is in it.
 *   3. Builds a contact sheet (index.html) to judge consistency by eye.
 *
 * Output: apps/api/.data/images/<event>/ (git-ignored).
 * Cast portraits are reused between runs to save money; pass --new-cast
 * to redraw them. --pages redraws only the listed page numbers.
 *
 * Photos: if a cast member's photo `src` points to a file (absolute, or
 * relative to apps/api/.data/photos/), its portrait is drawn from it.
 * After adding a photo, redraw portraits with --new-cast.
 *
 * History: an image that gets replaced is moved to history/<date-time>/
 * first, so the main folder always shows only the latest run.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { extname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  IMAGE_PRICE,
  Story,
  buildCastPortraitPrompt,
  buildPagePrompt,
  pageSetting,
  castFor,
  castOnPage,
  formatDollars,

  sampleUser,
  worldRulesFor,
  validateStory,
  pageFingerprint,
  type CastMember,
} from "@socialstory/core";
import { generateImage, type ReferenceImage } from "../images.js";
import { readDrawnFrom, writeDrawnFrom } from "../kits.js";
import { DATA_DIR } from "../paths.js";
import { pickEvent, pickPlayer, printRequestError } from "./report.js";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    "new-cast": { type: "boolean", default: false },
    pages: { type: "string" },
  },
});

const name = positionals[0] ?? "doctor";
const event = pickEvent(name);
const dataDir = DATA_DIR;
const storyFile = resolve(dataDir, "stories", `${name}.json`);
const outDir = resolve(dataDir, "images", name);

// ---- Load the story -------------------------------------------------------

if (!existsSync(storyFile)) {
  console.error(`\nNo story found for "${name}". Run this first:  pnpm write-story ${name}\n`);
  process.exit(1);
}
const saved = JSON.parse(readFileSync(storyFile, "utf8"));
const rawPages: unknown[] = saved?.story?.pages ?? [];
if (!rawPages.every((p) => typeof p === "object" && p !== null && "inPicture" in p)) {
  console.error(
    `\nThe saved "${name}" story was written before pages listed who's in each picture.` +
      `\nWrite it again (about 10 seconds, ~$0.015):  pnpm write-story ${name}\n`,
  );
  process.exit(1);
}
const story = Story.parse(saved.story);
const player = pickPlayer(event);
const cast = castFor(event, player);
const worldRules = worldRulesFor(sampleUser.region);
const photosDir = resolve(dataDir, "photos");

/** Loads a cast member's real photo, if they have one and the file exists. */
function loadPhoto(member: CastMember): ReferenceImage | undefined {
  // The SAM cutout (just the person or object) is the cleaner reference.
  const src = member.photo?.cutout ?? member.photo?.src;
  if (!src) return undefined;
  const path = isAbsolute(src) ? src : resolve(photosDir, src);
  const mimeType = ({ ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" } as const)[
    extname(path).toLowerCase() as ".png"
  ];
  if (!existsSync(path) || !mimeType) {
    console.warn(`  ! ${member.name}'s photo "${src}" wasn't found or isn't PNG/JPG/WEBP; drawing from the description.`);
    return undefined;
  }
  return { data: readFileSync(path), mimeType };
}
const unknown = validateStory(story, { castIds: cast.map((m) => m.id) }).issues.filter(
  (i) => i.code === "unknown-cast",
);
for (const issue of unknown) console.warn(`  ! Page ${(issue.page ?? 0) + 1}: ${issue.message} (skipping them)`);

const onlyPages = values.pages
  ? new Set(values.pages.split(",").map((n) => Number.parseInt(n.trim(), 10)))
  : undefined;

mkdirSync(outDir, { recursive: true });
const started = Date.now();
let drawn = 0;

// Replaced images go to history/<date-time>/ (local time, e.g. 2026-10-29_14-43-05).
const runStamp = (() => {
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}_${two(d.getHours())}-${two(d.getMinutes())}-${two(d.getSeconds())}`;
})();
const historyDir = resolve(outDir, "history", runStamp);
let archived = 0;

/** Moves an existing image out of the way before it's replaced. */
function archive(file: string) {
  const from = resolve(outDir, file);
  if (!existsSync(from)) return;
  mkdirSync(historyDir, { recursive: true });
  renameSync(from, resolve(historyDir, file));
  archived++;
}

// A shorter story than last time leaves old pages behind; move those too.
if (!onlyPages) {
  for (const file of readdirSync(outDir)) {
    const match = /^page-(\d+)\.png$/.exec(file);
    if (match && Number(match[1]) > story.pages.length) archive(file);
  }
}

interface Result {
  file?: string;
  seconds?: number;
  error?: string;
}

async function draw(label: string, file: string, run: () => ReturnType<typeof generateImage>): Promise<Result> {
  console.log(`  ... Drawing ${label}`);
  try {
    const image = await run();
    archive(file);
    writeFileSync(resolve(outDir, file), image.data);
    drawn++;
    console.log(`      done in ${image.seconds.toFixed(1)}s`);
    return { file, seconds: image.seconds };
  } catch (err) {
    printRequestError(err);
    const e = err as { message?: string };
    return { error: e.message ?? String(err) };
  }
}

// ---- 1. Cast sheet --------------------------------------------------------

console.log(`\nIllustrating "${story.title}" (${story.pages.length} pages, ${cast.length} cast members)\n`);
const castResults = new Map<string, Result>();
const portraits = new Map<string, ReferenceImage>();

for (const member of cast) {
  const file = `cast-${member.id}.png`;
  const path = resolve(outDir, file);
  let result: Result;
  if (existsSync(path) && !values["new-cast"]) {
    console.log(`  ... Reusing the saved ${member.kind === "prop" ? "drawing" : "portrait"} of ${member.name} (--new-cast redraws)`);
    result = { file };
  } else {
    const photo = loadPhoto(member);
    result = await draw(`${member.name}'s reference ${member.kind === "prop" ? "drawing" : "portrait"}${photo ? " from photo" : ""}`, file, () =>
      generateImage("castPortrait", buildCastPortraitPrompt(member, { fromPhoto: !!photo }), photo ? [photo] : []),
    );
  }
  castResults.set(member.id, result);
  if (result.file) portraits.set(member.id, { data: readFileSync(resolve(outDir, result.file)), mimeType: "image/png" });
}

// ---- 2. Pages ---------------------------------------------------------------

const pageResults: Array<Result & { refs: CastMember[]; skipped?: boolean }> = [];
// Remember what each picture was drawn from, so publishing can spot pictures
// whose words changed afterwards.
const drawnFrom = readDrawnFrom(name, dataDir);
for (const [i, page] of story.pages.entries()) {
  const number = i + 1;
  const file = `page-${String(number).padStart(2, "0")}.png`;
  const refs = castOnPage(page, cast).filter((m) => portraits.has(m.id));
  if (onlyPages && !onlyPages.has(number)) {
    pageResults.push({ file: existsSync(resolve(outDir, file)) ? file : undefined, refs, skipped: true });
    continue;
  }
  const result = await draw(`page ${number} of ${story.pages.length}`, file, () =>
    generateImage(
      "page",
      buildPagePrompt(page, refs, worldRules, pageSetting(page, event)),
      refs.map((m) => portraits.get(m.id)!),
    ),
  );
  if (result.file) drawnFrom.pages[file] = pageFingerprint(page);
  pageResults.push({ ...result, refs });
}
writeDrawnFrom(name, drawnFrom, dataDir);

// ---- 3. Contact sheet --------------------------------------------------------

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const stamp = Date.now();
const img = (r: Result | undefined, alt: string) =>
  r?.file
    ? `<img src="${r.file}?v=${stamp}" alt="${esc(alt)}">`
    : `<div class="missing">${esc(r?.error ?? "not drawn")}</div>`;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(story.title)}: contact sheet</title>
<style>
  body { margin: 0; padding: 24px 16px 64px; background: #f4f1ea; color: #2b3236; font-family: system-ui, sans-serif; }
  main { max-width: 1200px; margin: 0 auto; }
  h1 { margin: 0 0 4px; } h2 { margin: 32px 0 12px; } .muted { color: #6b7478; }
  .cast { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
  .pages { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; }
  figure { margin: 0; background: #fbfaf6; border: 1px solid #ddd6c8; border-radius: 14px; padding: 12px; }
  img { width: 100%; border-radius: 10px; display: block; background: #eee8dc; }
  figcaption { margin-top: 10px; font-size: 14px; line-height: 1.5; }
  .text { font-size: 17px; margin: 6px 0; } .brief { color: #6b7478; font-style: italic; }
  .missing { aspect-ratio: 3/2; display: grid; place-items: center; text-align: center; padding: 12px;
             background: #f3e3df; color: #8a3b2e; border-radius: 10px; font-size: 13px; }
</style></head><body><main>
<h1>${esc(story.title)}</h1>
<p class="muted">Contact sheet for "${esc(event.title)}". Check that each person looks the same on every page,
that every picture matches its words, and that nobody appears who isn't listed.</p>

<h2>Cast (reference portraits)</h2>
<div class="cast">
${cast
  .map(
    (m) => `<figure>${img(castResults.get(m.id), m.name)}<figcaption><strong>${esc(m.name)}</strong>
<br><span class="muted">${esc(m.appearance ?? "no appearance given")}</span></figcaption></figure>`,
  )
  .join("\n")}
</div>

<h2>Pages</h2>
<div class="pages">
${story.pages
  .map((page, i) => {
    const r = pageResults[i]!;
    return `<figure>${img(r, `Page ${i + 1}`)}<figcaption>
<strong>Page ${i + 1}</strong> <span class="muted">(${page.section})${
      r.seconds ? ` · ${r.seconds.toFixed(1)}s` : r.skipped ? " · not redrawn this run" : ""
    }</span>
${page.sentences.map((s) => `<p class="text">${esc(s.text)}</p>`).join("")}
<p class="brief">Picture: ${esc(page.sceneBrief ?? "(no brief)")}</p>
<p class="muted">In the picture: ${r.refs.length ? esc(r.refs.map((m) => m.name).join(", ")) : "nobody"}</p>
</figcaption></figure>`;
  })
  .join("\n")}
</div>
</main></body></html>`;

const sheet = resolve(outDir, "index.html");
writeFileSync(sheet, html);

const failures = [...castResults.values(), ...pageResults].filter((r) => r.error).length;
console.log(
  `\n  Drew ${drawn} image(s) in ${((Date.now() - started) / 1000).toFixed(1)}s` +
    ` | about ${formatDollars(drawn * IMAGE_PRICE)}` +
    (failures ? ` | ${failures} failed (shown in red on the sheet)` : ""),
);
if (archived) console.log(`  Moved ${archived} older image(s) to ${historyDir}`);
console.log(`\n  Contact sheet: ${pathToFileURL(sheet).href}`);
console.log("  (Ctrl+click the link, or paste it into your browser.)\n");
