/**
 * `pnpm photo-list [event]` from the repo root. Free; no API calls.
 *
 * Prints the photo checklist a user would see for a sample event:
 * what to photograph, why it helps, and how to take it.
 */
import { photoChecklist } from "@socialstory/core";
import { pickEvent, pickPlayer } from "./report.js";

const name = process.argv[2] ?? "doctor";
const event = pickEvent(name);
const { items, generalTips } = photoChecklist(event, pickPlayer(event));

console.log(`\nPhotos to take for "${event.title}"\n`);
for (const tip of generalTips) console.log(`  * ${tip}`);

for (const [tier, heading] of [
  ["most-helpful", "MOST HELPFUL"],
  ["nice-to-have", "NICE TO HAVE"],
] as const) {
  const group = items.filter((i) => i.priority === tier);
  if (!group.length) continue;
  console.log(`\n  ${heading}`);
  for (const item of group) {
    console.log(`  [ ] ${item.label}`);
    console.log(`      ${item.why}`);
    if (item.tip) console.log(`      Tip: ${item.tip}`);
  }
}
console.log();
