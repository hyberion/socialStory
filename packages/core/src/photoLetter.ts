import type { Event } from "./event.js";
import type { PhotoChecklist } from "./photos.js";
import { dateWords, wallClock } from "./when.js";

/**
 * The "why I'm taking pictures" letter a user can print or show on a phone
 * when asking to photograph a place or person (design: docs/photo-letter.md).
 *
 * Rule: every promise in it must be true of the app today. Two promises from
 * the draft are left out until they are: "I can delete them any time" (needs
 * the delete feature) and "the AI service doesn't train on them" (needs a
 * check of Meta's current terms).
 */
export interface PhotoLetter {
  title: string;
  opening: string[];
  promisesTitle: string;
  promises: string[];
  askTitle: string;
  asks: string[];
  closing: string[];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function photoLetter(event: Event, childName: string, list: PhotoChecklist): PhotoLetter {
  const name = childName.trim() || "my child";
  const t = wallClock(event.startsAt);
  const when = t ? ` on ${dateWords(t)}` : " soon";
  // Titles vary too much to sit inside a sentence; the kind of event reads better.
  const KIND_PHRASE: Record<string, string> = { doctor: "a doctor visit", dentist: "a dentist visit", haircut: "a haircut", school: "school", family: "a family visit", therapy: "therapy" };
  const what = KIND_PHRASE[event.kind] ?? (event.title.trim() ? `"${event.title.trim()}"` : "a visit");

  // What we'd photograph here: places and people, never the child's own things.
  const asks: string[] = [];
  for (const item of list.items) {
    if (item.attachTo.kind === "comfort") continue;
    if (item.attachTo.kind === "person") {
      const person = event.people.find((p) => p.id === (item.attachTo as { id: string }).id);
      asks.push(`${cap(person?.name ?? "You")}, only if you're comfortable with it. A name badge or a photo from your website works too.`);
    } else {
      asks.push(`${cap(item.label)}, without other people in the picture`);
    }
  }

  return {
    title: "Why I'm asking to take a few pictures",
    opening: [
      `Hi! ${name === "my child" ? "My child" : `My child, ${name},`} is coming here${when} for ${what}. New places and new people can be hard for ${name}, and seeing them ahead of time helps a lot.`,
      `I'm using an app that turns a few photos into a short picture story about the visit, so ${name} can read it at home and know what to expect.`,
    ],
    promisesTitle: "What the photos are for, and what they're not for",
    promises: [
      `They're used only to make ${name}'s story. Only the people who care for ${name} see it.`,
      "They're never posted, published or shared, and never used for ads.",
      "The app sends them to an AI service to make the story's drawings.",
    ],
    askTitle: "What I'd like to photograph (only with your OK)",
    asks: asks.slice(0, 8),
    closing: [`It's completely fine to say no to any of this. Thank you for helping ${name} feel ready.`],
  };
}
