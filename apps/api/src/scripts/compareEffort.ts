/**
 * `pnpm compare-effort [event] [levels...]` from the repo root.
 *
 * Writes the same story at several reasoning levels, one after another,
 * prints each story so you can judge the writing, then a summary table
 * of pass/fail, cost and time. Each result is saved as
 * apps/api/.data/stories/<event>-<level>.json.
 *
 * Examples:
 *   pnpm compare-effort doctor                (low, medium, high)
 *   pnpm compare-effort doctor medium high
 */
import { formatDollars, samplePlayer } from "@socialstory/core";
import { makeMetaDraftGenerator } from "../generators.js";
import { writeStory } from "../storyWriter.js";
import {
  pickEffort,
  pickEvent,
  printRequestError,
  printStory,
  printVerdict,
  saveResult,
  storyCost,
} from "./report.js";

const [name = "doctor", ...levelArgs] = process.argv.slice(2);
const event = pickEvent(name);
const levels = (levelArgs.length ? levelArgs : ["low", "medium", "high"]).map(pickEffort);

interface Row {
  effort: string;
  passed: string;
  attempts: number;
  outputTokens: number;
  cost: string;
  seconds: string;
}
const rows: Row[] = [];

for (const effort of levels) {
  console.log(`\n================ ${effort.toUpperCase()} reasoning ================`);
  const started = Date.now();
  try {
    const result = await writeStory(event, samplePlayer, makeMetaDraftGenerator({ effort }), {
      onProgress: (m) => console.log(`  ... ${m}`),
    });
    const seconds = (Date.now() - started) / 1000;
    printStory(result.story);
    printVerdict(result, seconds);
    saveResult(`${name}-${effort}`, result);
    rows.push({
      effort,
      passed: result.validation.ok ? "yes" : "NO",
      attempts: result.attempts.length,
      outputTokens: result.totalUsage.outputTokens,
      cost: formatDollars(storyCost(result)),
      seconds: seconds.toFixed(1),
    });
  } catch (err) {
    printRequestError(err);
    rows.push({ effort, passed: "error", attempts: 0, outputTokens: 0, cost: "-", seconds: "-" });
  }
}

console.log(`\n================ SUMMARY: ${event.title} ================\n`);
console.table(rows);
console.log("\nThe validator only checks the rules it can count. Read the stories above and judge the writing too.\n");
