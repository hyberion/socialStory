/**
 * `pnpm write-story [event]` from the repo root.
 *
 * Has Muse Spark write a Social Story for one of the sample events,
 * runs it through the validator (revising if needed), prints it, and
 * saves it to apps/api/.data/stories/<event>.json (git-ignored).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sampleChild, sampleEvents, type Story } from "@socialstory/core";
import { metaDraftGenerator } from "../generators.js";
import { writeStory } from "../storyWriter.js";

const name = process.argv[2] ?? "doctor";
const event = sampleEvents[name];
if (!event) {
  console.error(`\nNo sample event called "${name}". Choose one of: ${Object.keys(sampleEvents).join(", ")}\n`);
  process.exit(1);
}

function printStory(story: Story) {
  console.log(`\n  ${story.title}\n  ${"-".repeat(story.title.length)}`);
  story.pages.forEach((page, i) => {
    console.log(`\n  Page ${i + 1} (${page.section}${page.stepId ? `, step ${page.stepId}` : ""})`);
    for (const s of page.sentences) console.log(`    [${s.type.padEnd(11)}] ${s.text}`);
    if (page.sceneBrief) console.log(`    picture: ${page.sceneBrief}`);
  });
}

console.log(`\nWriting a story for "${event.title}" (${sampleChild.displayName}, ${sampleChild.readingLevel})\n`);
const started = Date.now();

let result: Awaited<ReturnType<typeof writeStory>>;
try {
  result = await writeStory(event, sampleChild, metaDraftGenerator, {
    onProgress: (m) => console.log(`  ... ${m}`),
  });
} catch (err) {
  // Show Meta's own error message (bad key, rejected schema, rate limit...) instead of a stack trace.
  const e = err as { status?: number; message?: string; error?: unknown };
  console.error(`\n  The request failed${e.status ? ` (HTTP ${e.status})` : ""}: ${e.message ?? String(err)}`);
  if (e.error) console.error(`  Details: ${JSON.stringify(e.error)}`);
  console.error();
  process.exit(1);
}

printStory(result.story);

const { validation, attempts, totalUsage } = result;
console.log(`\n  Verdict: ${validation.ok ? "PASSES" : "STILL FAILING"}`);
console.log(
  `  Describing : coaching = ${validation.stats.describing} : ${validation.stats.coaching}` +
    ` (needs 2:1 or better)`,
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
  `  Total: ${totalUsage.inputTokens} in, ${totalUsage.outputTokens} out` +
    ` (${totalUsage.reasoningTokens} reasoning) in ${((Date.now() - started) / 1000).toFixed(1)}s`,
);

const here = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(here, "../../.data/stories", `${name}.json`);
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(result, null, 2));
console.log(`\n  Saved to ${outFile}\n`);
