import type { Communication, DetailLevel, HardThing, ReadingLevel, WayIn } from "./profile.js";

/** Plain words for the profile form and interview. */
export const HARD_THING_LABELS: Record<HardThing, string> = {
  "loud-places": "Loud places",
  "sudden-noises": "Sudden noises",
  "bright-lights": "Bright lights",
  "being-touched": "Being touched",
  waiting: "Waiting",
  "new-people": "New people",
  crowds: "Crowds",
  "strong-smells": "Strong smells",
  "changes-in-plans": "Changes in plans",
  "being-away-from-family": "Being away from family",
};

/** How each hard thing is described to the story writer. */
export const HARD_THING_PROMPTS: Record<HardThing, string> = {
  "loud-places": "loud places",
  "sudden-noises": "sudden noises",
  "bright-lights": "bright lights",
  "being-touched": "being touched",
  waiting: "waiting",
  "new-people": "meeting new people",
  crowds: "crowds",
  "strong-smells": "strong smells",
  "changes-in-plans": "changes in plans",
  "being-away-from-family": "being away from family",
};

export const COMMUNICATION_LABELS: Record<Communication, string> = {
  "full-sentences": "Talks in full sentences",
  "short-phrases": "Talks in short phrases",
  "single-words": "Uses single words",
  aac: "Uses an AAC device or app",
  "mostly-nonspeaking": "Mostly doesn't use spoken words",
};

export const WAY_IN_LABELS: Record<WayIn, string> = {
  read: "Reading the words",
  listen: "Listening to the story read aloud",
  interact: "Games and tapping things",
};

/**
 * The player's age today: from birth month and year when given (so it keeps
 * up by itself), otherwise the age the user typed. Before the birth month
 * comes round, the birthday hasn't happened yet this year.
 */
export function currentAge(
  p: { age?: number; birthMonth?: number; birthYear?: number },
  today: Date = new Date(),
): number | undefined {
  if (p.birthYear) {
    const month = today.getMonth() + 1;
    const age = today.getFullYear() - p.birthYear - (p.birthMonth && month < p.birthMonth ? 1 : 0);
    return age > 0 ? age : undefined;
  }
  return p.age;
}

/**
 * Starting suggestions from age, shown as "suggested" and never applied on
 * their own (principle 1: the parent knows the child; age is a weak guide).
 */
export function suggestFromAge(age: number): { readingLevel: ReadingLevel; detailLevel: DetailLevel } {
  if (age < 5) return { readingLevel: "pre-verbal", detailLevel: "essentials" };
  if (age < 8) return { readingLevel: "early-reader", detailLevel: "standard" };
  if (age < 12) return { readingLevel: "reader", detailLevel: "standard" };
  return { readingLevel: "fluent-reader", detailLevel: "more" };
}
