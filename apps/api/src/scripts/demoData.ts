/**
 * `pnpm demo-data <story> [story ...]` from the repo root.
 *
 * Packs a copy of the data the public demo needs into demo-data/ (at the
 * repo root, git-ignored), to copy to the server. Only the stories you name
 * go in, with exactly what they use: the published kit, the story and its
 * pictures and recordings, its event, and its child's profile and photos.
 * Nothing else from your data folder (other children, their photos, other
 * stories) is copied, and the full list is printed so you can check it.
 *
 * Built-in samples (Sam) need no profile file; they're part of the app.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_DIR } from "../paths.js";

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error("\nName the stories to include, e.g.  pnpm demo-data doctor\n");
  process.exit(1);
}
const bad = ids.find((id) => !/^[a-z0-9-]+$/.test(id));
if (bad) {
  console.error(`\n"${bad}" isn't a story id.\n`);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../../../demo-data");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const copied: string[] = [];
function copy(rel: string, filter?: (path: string) => boolean) {
  const from = join(DATA_DIR, rel);
  if (!existsSync(from)) return false;
  cpSync(from, join(out, rel), { recursive: true, filter: (p) => (filter ? filter(p) : true) });
  copied.push(rel + (statSync(from).isDirectory() ? "/" : ""));
  return true;
}

const players = new Set<string>();
for (const id of ids) {
  console.log(`\n  ${id}`);
  if (!copy(`published/${id}`)) console.log("    ! not published yet (run pnpm publish-kit first); the player app won't show it");
  copy(`stories/${id}.json`);
  // Pictures and recordings, but not the history of replaced pictures.
  copy(`images/${id}`, (p) => !relative(join(DATA_DIR, "images", id), p).startsWith("history"));
  copy(`photos/events/${id}`);
  const eventFile = join(DATA_DIR, "events", `${id}.json`);
  if (existsSync(eventFile)) {
    copy(`events/${id}.json`);
    const { playerId } = JSON.parse(readFileSync(eventFile, "utf8")) as { playerId?: string };
    if (playerId) players.add(playerId);
  }
}
for (const pid of players) {
  if (copy(`players/${pid}.json`)) copy(`photos/players/${pid}`);
}

const count = (dir: string): number =>
  readdirSync(dir, { withFileTypes: true }).reduce((n, d) => n + (d.isDirectory() ? count(join(dir, d.name)) : 1), 0);

console.log("\n  Copied (check this before it goes on the server):");
for (const c of copied) console.log(`    ${c}`);
console.log(`\n  Children included: ${players.size ? [...players].join(", ") : "none saved (built-in samples only)"}`);
console.log(`  ${count(out)} files in ${out}\n`);
