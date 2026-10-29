import { z } from "zod";

/**
 * An Event is the core object: something coming up that the child
 * needs to get ready for. Everything the app generates is built from it.
 */

/** A stored photo the parent uploaded (the file itself lives in object storage). */
export const PhotoRef = z.object({
  id: z.string(),
  /** Storage key or URL. */
  src: z.string(),
  /** Parent's short description, also used as the SAM prompt hint. */
  caption: z.string().optional(),
});
export type PhotoRef = z.infer<typeof PhotoRef>;

export const Person = z.object({
  id: z.string(),
  name: z.string().min(1),
  /** e.g. "doctor", "teacher", "barber". */
  role: z.string().optional(),
  photo: PhotoRef.optional(),
  /** One or two friendly, true facts: "Dr. Patel has a fish tank." */
  facts: z.array(z.string()).max(3).default([]),
});
export type Person = z.infer<typeof Person>;

export const Place = z.object({
  id: z.string(),
  name: z.string().min(1),
  /** Outside, entrance, the room where it happens. */
  photos: z.array(PhotoRef).default([]),
  /** Sensory notes the parent knows: "loud", "smells like soap", "bright lights". */
  sensoryNotes: z.array(z.string()).default([]),
});
export type Place = z.infer<typeof Place>;

export const Step = z.object({
  id: z.string(),
  /** Plain description in order: "We park in the big lot." */
  description: z.string().min(1),
  placeId: z.string().optional(),
  personIds: z.array(z.string()).default([]),
  /** True for steps that can't change (the shot happens). Principle 2: be honest about these. */
  fixed: z.boolean().default(false),
});
export type Step = z.infer<typeof Step>;

export const HardPart = z.object({
  id: z.string(),
  /** What the parent expects to be tough: "the waiting room", "the shot". */
  description: z.string().min(1),
  stepId: z.string().optional(),
});
export type HardPart = z.infer<typeof HardPart>;

export const EventStatus = z.enum([
  "draft",
  "event-confirmed",
  "script-approved",
  "cast-approved",
  "pages-approved",
  "published",
  "completed",
]);
export type EventStatus = z.infer<typeof EventStatus>;

/** How it went, logged after the event. Feeds the next prep arc. */
export const Reflection = z.object({
  /** ISO date-time. */
  loggedAt: z.string(),
  wentWell: z.array(z.string()).default([]),
  wasHard: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
export type Reflection = z.infer<typeof Reflection>;

export const Event = z.object({
  id: z.string(),
  childId: z.string(),
  /** "Visit to Dr. Patel" */
  title: z.string().min(1),
  /** "doctor", "school", "haircut", "travel", ... free text on purpose. */
  kind: z.string().min(1),
  /** ISO date-time of the event itself. */
  startsAt: z.string(),
  /** Why it's happening, in kid terms: "to help my body stay healthy". */
  purpose: z.string().optional(),
  /** Who goes with the child: "Dad", "Grandma", "Ms. Lee (teacher)". Empty = not given. */
  companions: z.array(Person).default([]),
  /** People the child will meet there: the doctor, the barber, the teacher. */
  people: z.array(Person).default([]),
  places: z.array(Place).default([]),
  steps: z.array(Step).min(1),
  hardParts: z.array(HardPart).default([]),
  /** Comfort items for this event (merged with the child's standing comforts). */
  comforts: z.array(z.string()).default([]),
  status: EventStatus.default("draft"),
  reflection: Reflection.optional(),
});
export type Event = z.infer<typeof Event>;
