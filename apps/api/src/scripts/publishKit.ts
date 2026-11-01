/**
 * `pnpm publish-kit [event]` from the repo root.
 *
 * Takes the story from `pnpm write-story` and the pictures from
 * `pnpm draw-story` and publishes them as a locked kit the player app can
 * read (apps/api/.data/published/<event>/). Publishing again replaces the
 * kit in one step. Later this becomes the Publish button in the user app.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Story, validateStory, castFor } from "@socialstory/core";
import { publishKit } from "../kits.js";
import { storiesDir } from "../paths.js";
import { pickEvent, pickPlayer } from "./report.js";

const name = process.argv[2] ?? "doctor";
const event = pickEvent(name);
const storyFile = resolve(storiesDir(), `${name}.json`);
if (!existsSync(storyFile)) {
  console.error(`\nNo story found for "${name}". Run this first:  pnpm write-story ${name}\n`);
  process.exit(1);
}
const story = Story.parse(JSON.parse(readFileSync(storyFile, "utf8")).story);

// The checker warns, never blocks: the user has the final say.
const player = pickPlayer(event);
const check = validateStory(story, { cast: castFor(event, player), readingLevel: player.readingLevel });
const { kit, warnings, dir } = publishKit({ id: name, event, player, story });

console.log(`\n  Published "${kit.title}" (${kit.pages.length} pages, ${kit.pages.filter((p) => p.image).length} pictures)`);
for (const issue of check.issues) console.log(`  ! Story check: ${issue.message}`);
for (const w of warnings) console.log(`  ! ${w.message}`);
console.log(`\n  Saved to ${dir}`);
console.log("  Open the player app (pnpm dev, then http://localhost:5174) to read it.\n");
