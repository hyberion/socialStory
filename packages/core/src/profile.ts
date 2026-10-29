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
]);
export type ReadingLevel = z.infer<typeof ReadingLevel>;

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
