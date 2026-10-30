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
  /** When set, the player shows a calendar with this date circled and a clock at this time (ISO). */
  when: z.string().optional(),
});
export type KitPage = z.infer<typeof KitPage>;

/** Someone (or something) in the kit's pictures, for the "Who's who?" game. */
export const KitCastMember = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  kind: z.enum(["person", "prop"]),
  name: z.string().min(1),
  /** Plain line the game says after the child answers: "Dr. Patel is the doctor." */
  intro: z.string(),
  /** Friendly facts from the user: "Dr. Patel has a fish tank in the waiting room." */
  facts: z.array(z.string()).default([]),
  /** File name of this member's approved portrait inside the kit, e.g. "cast-p-patel.png". */
  portrait: z.string().optional(),
});
export type KitCastMember = z.infer<typeof KitCastMember>;

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
  /** People and comfort items, with their approved portraits. */
  cast: z.array(KitCastMember).default([]),
});
export type PublishedKit = z.infer<typeof PublishedKit>;

/** What the shelf shows: enough to draw a cover without loading every page. */
export const KitSummary = z.object({
  id: z.string(),
  title: z.string(),
  eventStartsAt: z.string(),
  publishedAt: z.string(),
  cover: z.string().optional(),
  /** How many cast members have portraits; the "Who's who?" game needs at least two. */
  portraits: z.number().int().default(0),
});
export type KitSummary = z.infer<typeof KitSummary>;

export function summarizeKit(kit: PublishedKit): KitSummary {
  return {
    id: kit.id,
    title: kit.title,
    eventStartsAt: kit.eventStartsAt,
    publishedAt: kit.publishedAt,
    cover: kit.pages.find((p) => p.image)?.image,
    portraits: kit.cast.filter((m) => m.portrait && m.id !== "transport").length,
  };
}

/** Only these file names may be served from a kit folder (no paths, no tricks). */
export const KIT_FILE_PATTERN = /^(page-\d{2}|cast-[a-z0-9-]+)\.png$/;

/**
 * A short fingerprint of what a page's picture was drawn from: the picture
 * description and who's in it (the words only when there's no description,
 * because then the words are what the illustrator saw). If it changes, the
 * picture may no longer match.
 *
 * v2 (Oct 30): v1 also hashed the words, so adding "She is a new person to
 * me." flagged a picture that still fit. Old v1 values are ignored rather
 * than flagged. (FNV-1a; no Node crypto, so it runs in the browser too.)
 */
export function pageFingerprint(page: {
  sentences: Array<{ text: string }>;
  sceneBrief?: string;
  inPicture: string[];
}): string {
  const drawnFrom = page.sceneBrief?.trim() ? page.sceneBrief.trim() : page.sentences.map((s) => s.text.trim()).join(" ");
  const source = JSON.stringify([drawnFrom, [...page.inPicture].sort()]);
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `v2:${hash.toString(16).padStart(8, "0")}`;
}

/** True when a picture was drawn for a different picture description or cast than the page has now. */
export function pictureOutOfDate(
  drawnFor: string | undefined,
  page: Parameters<typeof pageFingerprint>[0],
): boolean {
  if (!drawnFor?.startsWith("v2:")) return false; // unknown or older format: don't guess
  return drawnFor !== pageFingerprint(page);
}

/**
 * The line the "Who's who?" game says once a member is named. Literal and
 * warm, no quiz language. Written for the player to hear, in the story's
 * own voice ("I", or the player's name).
 */
export function castIntro(
  member: { id: string; kind: "person" | "prop"; name: string; role: string },
  player: { displayName: string; perspective: "first" | "third" },
  companionIds: string[],
): string {
  const me = player.perspective === "first" ? "me" : player.displayName;
  if (member.id === "player") return player.perspective === "first" ? `This is me, ${member.name}!` : `This is ${member.name}!`;
  if (member.id === "transport") {
    return `${member.name.charAt(0).toUpperCase()}${member.name.slice(1)} takes ${me} there.`;
  }
  if (member.kind === "prop") return `${member.name} can come with ${me}.`;
  if (companionIds.includes(member.id)) return `${member.name} is coming with ${me}.`;
  const role = member.role.trim();
  if (!role || role === "someone the child will meet") return `${player.perspective === "first" ? "I" : player.displayName} will meet ${member.name}.`;
  return `${member.name} is the ${role}.`;
}
