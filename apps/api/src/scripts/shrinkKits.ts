/**
 * `pnpm shrink-kits` from the repo root.
 *
 * Makes the pictures of every story already on the shelf small enough to load
 * instantly (stories published from now on are shrunk when they're published).
 * Safe to run more than once: pictures already shrunk are left alone.
 */
import { listKits } from "../kits.js";
import { shrinkKitImages } from "../kitImages.js";

const kits = listKits();
if (!kits.length) console.log("\n  Nothing on the shelf yet.\n");
for (const k of kits) {
  const n = await shrinkKitImages(k.id);
  console.log(`  ${k.title}: ${n ? `${n} picture(s) made smaller` : "already small"}`);
}
console.log("");
