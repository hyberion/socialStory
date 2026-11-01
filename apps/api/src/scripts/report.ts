/** Shared console output for the story scripts. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MODEL_IDS,
  estimateCost,
  formatDollars,
  isReasoningEffort,
  sampleEvents,
  samplePlayer,
  type Event,
  type PlayerProfile,
  type ReasoningEffort,
  type Story,
} from "@socialstory/core";
import type { WriteStoryResult } from "../storyWriter.js";
import { listEvents, loadEvent } from "../events.js";
import { loadPlayer } from "../players.js";

export function storyCost(result: WriteStoryResult): number {
  return estimateCost(MODEL_IDS.spark, result.totalUsage);
}

/** Looks up a sample event by name, or exits with the list of choices. */
export function pickEvent(name: string): Event {
  // Events made in the app first, then the built-in samples.
  const event = loadEvent(name) ?? sampleEvents[name];
  if (!event) {
    const mine = listEvents().map((e) => e.id);
    console.error(
      `\nNo event called "${name}". Choose one of: ${[...mine, ...Object.keys(sampleEvents)].join(", ")}\n`,
    );
    process.exit(1);
  }
  return event;
}

/** The child an event is for: their saved profile, or the sample child. */
export function pickPlayer(event: Event): PlayerProfile {
  return loadPlayer(event.playerId) ?? samplePlayer;
}

/** Parses an effort name, or exits with the list of choices. */
export function pickEffort(value: string): ReasoningEffort {
  if (!isReasoningEffort(value)) {
    console.error(`\n"${value}" is not a reasoning effort. Use one of: minimal, low, medium, high, xhigh, max\n`);
    process.exit(1);
  }
  return value;
}

export function printStory(story: Story) {
  console.log(`\n  ${story.title}\n  ${"-".repeat(story.title.length)}`);
  story.pages.forEach((page, i) => {
    console.log(`\n  Page ${i + 1} (${page.section}${page.stepId ? `, step ${page.stepId}` : ""})`);
    for (const s of page.sentences) console.log(`    [${s.type.padEnd(11)}] ${s.text}`);
    if (page.sceneBrief) console.log(`    picture: ${page.sceneBrief}`);
  });
}

export function printVerdict(result: WriteStoryResult, seconds: number) {
  const { validation, attempts, totalUsage } = result;
  console.log(`\n  Verdict: ${validation.ok ? "PASSES" : "STILL FAILING"}`);
  console.log(
    `  Describing : coaching = ${validation.stats.describing} : ${validation.stats.coaching} (needs 2:1 or better)`,
  );
  for (const issue of validation.issues) {
    console.log(`  ${issue.severity === "error" ? "x" : "!"} ${issue.message}`);
  }
  console.log("\n  Attempts:");
  attempts.forEach((a, i) => {
    const errors = a.issues.filter((x) => x.severity === "error").length;
    console.log(
      `    ${i + 1}. ${a.kind.padEnd(6)} ${a.ok ? "passed" : `${errors} error(s)`}` +
        `  | ${a.usage.inputTokens} in, ${a.usage.outputTokens} out (${a.usage.reasoningTokens} reasoning)`,
    );
  });
  console.log(
    `  Total: ${totalUsage.inputTokens} in, ${totalUsage.outputTokens} out (${totalUsage.reasoningTokens} reasoning)` +
      ` | ${formatDollars(storyCost(result))} | ${seconds.toFixed(1)}s`,
  );
}

/** Shows Meta's own error message (bad key, rejected schema, rate limit...) instead of a stack trace. */
export function printRequestError(err: unknown) {
  const e = err as { status?: number; message?: string; error?: unknown };
  console.error(`\n  The request failed${e.status ? ` (HTTP ${e.status})` : ""}: ${e.message ?? String(err)}`);
  if (e.error) console.error(`  Details: ${JSON.stringify(e.error)}`);
  console.error();
}

/** Saves a result to apps/api/.data/stories/<fileName>.json (git-ignored) and returns the path. */
export function saveResult(fileName: string, result: unknown): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const outFile = resolve(here, "../../.data/stories", `${fileName}.json`);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(result, null, 2));
  return outFile;
}
