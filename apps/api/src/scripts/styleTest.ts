/**
 * `pnpm style-test` from the repo root.
 *
 * Draws the same scene in every illustration look, the way the app would:
 * for each look, Sam's portrait and Bear's drawing in that look (the cast
 * sheet), then one story page drawn from them. Builds a side-by-side
 * comparison sheet for choosing which looks to offer (and for the demo).
 *
 * 3 pictures per look, about $0.03 a look. Already-drawn pictures are kept;
 * --redo draws everything again. --looks clay,graphic draws only those.
 * Output: apps/api/.data/style-test/ (git-ignored).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  ILLUSTRATION_LOOKS,
  IMAGE_PRICE,
  buildCastPortraitPrompt,
  buildPagePrompt,
  castFor,
  formatDollars,
  pageSetting,
  sampleEvent,
  samplePlayer,

  sampleUser,
  worldRulesFor,
  type IllustrationLook,
  type StoryPage,
} from "@socialstory/core";
import { generateImage, type ReferenceImage } from "../images.js";
import { DATA_DIR } from "../paths.js";
import { printRequestError } from "./report.js";

const { values } = parseArgs({ options: { redo: { type: "boolean", default: false }, looks: { type: "string" } } });
const all = Object.keys(ILLUSTRATION_LOOKS) as IllustrationLook[];
const looks = values.looks ? (values.looks.split(",").map((s) => s.trim()) as IllustrationLook[]).filter((l) => all.includes(l)) : all;
const outDir = resolve(DATA_DIR, "style-test");
mkdirSync(outDir, { recursive: true });

// One scene for every look: Sam waiting near the fish tank, holding Bear.
const cast = castFor(sampleEvent, samplePlayer);
const sam = cast.find((m) => m.id === "player")!;
const bear = cast.find((m) => m.id === "bear")!;
const scene: StoryPage = {
  section: "body",
  stepId: "s2",
  inPicture: ["player", "bear"],
  sceneBrief: "Sam sits in the waiting room near a fish tank, holding Bear.",
  sentences: [{ text: "We wait near a fish tank.", type: "descriptive" }],
};
const worldRules = worldRulesFor(sampleUser.region);

let drawn = 0;
const started = Date.now();
async function draw(file: string, run: () => ReturnType<typeof generateImage>): Promise<Buffer | undefined> {
  const path = resolve(outDir, file);
  if (existsSync(path) && !values.redo) return readFileSync(path);
  try {
    const image = await run();
    writeFileSync(path, image.data);
    drawn++;
    console.log(`  done ${file} (${image.seconds.toFixed(1)}s)`);
    return image.data;
  } catch (err) {
    console.log(`  failed ${file}`);
    printRequestError(err);
    return undefined;
  }
}

async function oneLook(look: IllustrationLook) {
  const [samImg, bearImg] = await Promise.all([
    draw(`${look}-sam.png`, () => generateImage("castPortrait", buildCastPortraitPrompt(sam, { look }))),
    draw(`${look}-bear.png`, () => generateImage("castPortrait", buildCastPortraitPrompt(bear, { look }))),
  ]);
  const refs: ReferenceImage[] = [samImg, bearImg].filter((b): b is Buffer => !!b).map((data) => ({ data, mimeType: "image/png" }));
  const members = [samImg ? sam : undefined, bearImg ? bear : undefined].filter((m) => !!m);
  await draw(`${look}-page.png`, () =>
    generateImage("page", buildPagePrompt(scene, members, worldRules, pageSetting(scene, sampleEvent), look), refs),
  );
}

console.log(`\nDrawing ${looks.length} look(s), 3 pictures each, a few at a time…\n`);
// Three looks at a time keeps it quick without flooding the API.
for (let i = 0; i < looks.length; i += 3) await Promise.all(looks.slice(i, i + 3).map(oneLook));

// ---- Comparison sheet ----
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const v = Date.now();
const cell = (file: string, alt: string) =>
  existsSync(resolve(outDir, file)) ? `<img src="${file}?v=${v}" alt="${esc(alt)}">` : `<div class="missing">not drawn</div>`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Illustration looks</title><style>
body{margin:0;padding:24px 16px 64px;background:#f4f1ea;color:#2b3236;font-family:system-ui,sans-serif}
main{max-width:1300px;margin:0 auto} h1{margin:0 0 4px} .muted{color:#6b7478}
.look{display:grid;grid-template-columns:180px 140px 140px 1fr;gap:12px;align-items:center;background:#fbfaf6;border:1px solid #ddd6c8;border-radius:14px;padding:12px;margin:14px 0}
.look img{width:100%;border-radius:8px;display:block;background:#eee8dc}
.missing{aspect-ratio:1;display:grid;place-items:center;background:#f3e3df;color:#8a3b2e;border-radius:8px;font-size:13px}
h2{margin:0;font-size:1.1rem} @media(max-width:800px){.look{grid-template-columns:1fr 1fr}}
</style></head><body><main>
<h1>Illustration looks</h1>
<p class="muted">The same scene in every look: Sam waiting near the fish tank, holding Bear. Each look gets its own cast sheet (Sam and Bear, left), and the page is drawn from it, exactly as the app does. Every look keeps the same rules: calm faces, plain backgrounds, no text, nothing frightening.</p>
${looks
  .map(
    (l) => `<section class="look"><div><h2>${esc(ILLUSTRATION_LOOKS[l].label)}</h2><p class="muted">${esc(ILLUSTRATION_LOOKS[l].forWho)}</p></div>
${cell(`${l}-sam.png`, `Sam, ${ILLUSTRATION_LOOKS[l].label}`)}${cell(`${l}-bear.png`, `Bear, ${ILLUSTRATION_LOOKS[l].label}`)}${cell(`${l}-page.png`, `Page, ${ILLUSTRATION_LOOKS[l].label}`)}</section>`,
  )
  .join("\n")}
</main></body></html>`;
const sheet = resolve(outDir, "index.html");
writeFileSync(sheet, html);
console.log(`\n  Drew ${drawn} picture(s) in ${((Date.now() - started) / 1000).toFixed(0)}s, about ${formatDollars(drawn * IMAGE_PRICE)}`);
console.log(`  Comparison sheet: ${pathToFileURL(sheet).href}\n`);
