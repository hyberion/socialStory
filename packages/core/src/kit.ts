import { z } from "zod";
import { SensorySettings } from "./profile.js";
import { Sentence, StorySection } from "./story.js";

/**
 * A published kit: the locked snapshot the player app reads.
 *
 * Principle 5: nothing reaches the player until a user approves it.
 * Publishing copies the approved story and pictures into one place, so
 * later redraws or edits can't change what the child sees until the
 * user publishes again.
 */

export const KitPage = z.object({
  section: StorySection,
  sentences: z.array(Sentence).min(1),
  /** File name of this page's picture inside the kit, e.g. "page-01.png". */
  image: z.string().optional(),
  /** Plain description of the picture, for screen readers. */
  imageAlt: z.string().optional(),
});
export type KitPage = z.infer<typeof KitPage>;

export const PublishedKit = z.object({
  /** URL-safe id, e.g. "doctor". */
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  /** ISO date-time of the event itself, for the countdown later. */
  eventStartsAt: z.string(),
  /** ISO date-time this kit was published. */
  publishedAt: z.string(),
  /** The player's sensory settings at publish time (sound, reading speed...). */
  sensory: SensorySettings,
  pages: z.array(KitPage).min(1),
});
export type PublishedKit = z.infer<typeof PublishedKit>;

/** What the shelf shows: enough to draw a cover without loading every page. */
export const KitSummary = z.object({
  id: z.string(),
  title: z.string(),
  eventStartsAt: z.string(),
  publishedAt: z.string(),
  cover: z.string().optional(),
});
export type KitSummary = z.infer<typeof KitSummary>;

export function summarizeKit(kit: PublishedKit): KitSummary {
  return {
    id: kit.id,
    title: kit.title,
    eventStartsAt: kit.eventStartsAt,
    publishedAt: kit.publishedAt,
    cover: kit.pages.find((p) => p.image)?.image,
  };
}

/** Only these file names may be served from a kit folder (no paths, no tricks). */
export const KIT_FILE_PATTERN = /^(page-\d{2}|cast-[a-z0-9-]+)\.png$/;

/**
 * A short fingerprint of what a page's picture was drawn from: its words,
 * picture description and who's in it. If the fingerprint changes, the
 * picture may no longer match. (FNV-1a; no Node crypto, so it runs in the
 * browser too.)
 */
export function pageFingerprint(page: {
  sentences: Array<{ text: string }>;
  sceneBrief?: string;
  inPicture: string[];
}): string {
  const source = JSON.stringify([page.sentences.map((s) => s.text), page.sceneBrief ?? "", [...page.inPicture].sort()]);
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
