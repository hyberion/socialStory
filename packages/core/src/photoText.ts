import type { Event } from "./event.js";
import type { PhotoChecklist } from "./photos.js";
import { dateWords, timeWords, wallClock } from "./when.js";

/**
 * The photo to-do list as plain text, for email, copying or sharing to a
 * phone. Checkbox marks so it works as a checklist on paper or in notes.
 */
export function photoListText(event: Event, childName: string, list: PhotoChecklist): string {
  const t = wallClock(event.startsAt);
  const when = t ? ` (${dateWords(t)}, ${timeWords(t)})` : "";
  const block = (title: string, items: PhotoChecklist["items"]) =>
    items.length
      ? [`${title}:`, ...items.map((p) => `☐ ${p.label}: ${p.why}${p.tip ? ` ${p.tip}` : ""}`), ""]
      : [];
  return [
    `Photos for ${childName}'s story: ${event.title}${when}`,
    "Every photo is optional. Gather what you can.",
    "",
    ...block("Most helpful", list.items.filter((p) => p.priority === "most-helpful")),
    ...block("Nice to have", list.items.filter((p) => p.priority === "nice-to-have")),
    "Tips:",
    ...list.generalTips.map((tip) => `- ${tip}`),
  ].join("\n");
}
