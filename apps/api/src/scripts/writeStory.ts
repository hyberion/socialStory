/**
 * `pnpm write-story [event] [--effort <level>]` from the repo root.
 *
 * Has Muse Spark write a Social Story for one of the sample events,
 * runs it through the validator (revising if needed), prints it with
 * its cost, and saves it to apps/api/.data/stories/ (git-ignored).
 *
 * Examples:
 *   pnpm write-story doctor
 *   pnpm write-story doctor --effort medium
 */
import { parseArgs } from "node:util";
import { samplePlayer, TEXT_TASKS } from "@socialstory/core";
import { makeMetaDraftGenerator } from "../generators.js";
import { writeStory, type WriteStoryResult } from "../storyWriter.js";
import { pickEffort, pickEvent, printRequestError, printStory, printVerdict, saveResult } from "./report.js";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { effort: { type: "string" } },
});

const name = positionals[0] ?? "doctor";
const event = pickEvent(name);
const effort = values.effort ? pickEffort(values.effort) : undefined;

console.log(
  `\nWriting a story for "${event.title}" (${samplePlayer.displayName}, ${samplePlayer.readingLevel})` +
    ` at ${effort ?? TEXT_TASKS.writeStory.effort} reasoning\n`,
);
const started = Date.now();

let result: WriteStoryResult;
try {
  result = await writeStory(event, samplePlayer, makeMetaDraftGenerator({ effort }), {
    onProgress: (m) => console.log(`  ... ${m}`),
  });
} catch (err) {
  printRequestError(err);
  process.exit(1);
}

printStory(result.story);
printVerdict(result, (Date.now() - started) / 1000);
const saved = saveResult(effort ? `${name}-${effort}` : name, result);
console.log(`\n  Saved to ${saved}\n`);
