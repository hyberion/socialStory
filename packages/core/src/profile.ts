import { z } from "zod";
import { ComfortItem } from "./event.js";

/**
 * Everything about how content is shaped for one player.
 * Principle 1: the system adapts to the player. Every field here is
 * user-adjustable at any time; nothing assumes a "right" level.
 */

export const ReadingLevel = z.enum([
  /** Pictures and narration only; minimal or no on-screen text. */
  "pre-verbal",
  /** Short sentences, one idea per page, large text. */
  "early-reader",
  /** Full sentences, more detail per page. */
  "reader",
  /** Longer pages for strong readers, older kids and teens; never babyish. */
  "fluent-reader",
]);
export type ReadingLevel = z.infer<typeof ReadingLevel>;

/**
 * How much information a story gives, separate from how many words it uses.
 * Lets a strong reader get a simple story, or an early reader a detailed one,
 * and lets stories grow with the player.
 */
export const DetailLevel = z.enum([
  /** Just the steps in order, one idea per page, plus the coping choices. */
  "essentials",
  /** Steps, how things look, sound and feel, and coping choices. */
  "standard",
  /** Adds why things happen and what other people are doing or thinking. */
  "more",
  /** Adds honest what-ifs, choices at more steps, and a more grown-up tone. */
  "full",
]);
export type DetailLevel = z.infer<typeof DetailLevel>;

export const ArtStyle = z.enum([
  /** Real photos the user uploaded. */
  "photo",
  /** Illustrated scenes with real faces and objects cut in (SAM). */
  "hybrid",
  /** Soft, fully illustrated scenes. */
  "illustrated",
]);
export type ArtStyle = z.infer<typeof ArtStyle>;

/** Gray: stories are written in first or third person, not second. */
export const Perspective = z.enum(["first", "third"]);
export type Perspective = z.infer<typeof Perspective>;

export const SensorySettings = z.object({
  /** Any sound at all. Off means silent mode, captions only. */
  soundEnabled: z.boolean().default(true),
  /** Narration speed multiplier; slower is often better. */
  narrationRate: z.number().min(0.5).max(1.5).default(0.9),
  /** Reduce motion: no transitions beyond a simple fade. */
  reduceMotion: z.boolean().default(true),
});
export type SensorySettings = z.infer<typeof SensorySettings>;

/** Which review gates a user sees before a kit is published. */
export const ReviewMode = z.enum([
  /** Review every stage (default for first-time users). */
  "every-stage",
  /** Approve the script, then only the finished kit. */
  "script-and-final",
  /** Review only the finished kit. */
  "final-only",
]);
export type ReviewMode = z.infer<typeof ReviewMode>;

export const PlayerProfile = z.object({
  id: z.string(),
  /** What the player is called in stories. */
  displayName: z.string().min(1),
  readingLevel: ReadingLevel.default("early-reader"),
  detailLevel: DetailLevel.default("standard"),
  artStyle: ArtStyle.default("hybrid"),
  perspective: Perspective.default("first"),
  sensory: SensorySettings.default({}),
  reviewMode: ReviewMode.default("every-stage"),
  /** How the player looks, for consistent pictures: "short curly brown hair, green t-shirt". */
  appearance: z.string().optional(),
  /** Things that reliably comfort this player, reused across events. */
  comforts: z.array(ComfortItem).default([]),
  /** Interests that can make content more engaging (trains, dinosaurs...). */
  interests: z.array(z.string()).default([]),
});
export type PlayerProfile = z.infer<typeof PlayerProfile>;
