import type { Event } from "./event.js";
import type { PlayerProfile } from "./profile.js";
import { comfortsFor } from "./cast.js";

/**
 * A photo checklist for the user, built from the event itself, with no
 * AI involved: instant, free and predictable. It exists so users don't
 * forget a useful photo, don't have to think up the list, and don't
 * feel they need to photograph everything.
 *
 * Two tiers keep it light: "most helpful" is capped at a handful, and
 * everything else is "nice to have." Every item is optional.
 *
 * Deliberately never suggests photographing the hard parts themselves
 * (needles, a crying child): familiarity, yes; frightening close-ups, no.
 */

export type PhotoPriority = "most-helpful" | "nice-to-have";

export interface PhotoSuggestion {
  id: string;
  /** What to photograph, as the user will read it. */
  label: string;
  /** Why it helps, in one short line. */
  why: string;
  /** How to take it, if there's something worth saying. */
  tip?: string;
  priority: PhotoPriority;
  /** What this photo will be attached to, so the upload lands in the right place. */
  attachTo:
    | { kind: "person"; id: string }
    | { kind: "place"; id: string }
    | { kind: "comfort"; id: string }
    | { kind: "event" };
}

export interface PhotoChecklist {
  items: PhotoSuggestion[];
  /** Short tips shown once above the list. */
  generalTips: string[];
}

/** At most this many "most helpful" photos; the rest become "nice to have". */
export const MAX_MOST_HELPFUL = 5;

export const GENERAL_PHOTO_TIPS = [
  "Every photo is optional. Three to five good ones is plenty.",
  "Take photos from your child's eye height, so they match what your child will see.",
  "Calm, everyday shots work best. They don't need to be perfect.",
  "Avoid other people's faces, like other patients or students. Ask before photographing staff.",
];

/** Extra things worth photographing for common kinds of events. Matched by keyword. */
const KIND_EXTRAS: Array<{ keywords: string[]; items: Array<{ label: string; why: string }> }> = [
  {
    keywords: ["doctor", "pediatric", "clinic", "checkup", "check-up", "physical"],
    items: [
      { label: "The check-in desk", why: "Often the first stop inside, and sometimes busy." },
      { label: "The exam room", why: "Where the visit itself happens." },
      { label: "The exam table with its paper cover", why: "The crinkly paper surprises some kids." },
      { label: "The scale", why: "Many visits start with standing on it." },
    ],
  },
  {
    keywords: ["dentist", "dental", "orthodont"],
    items: [
      { label: "The dentist chair", why: "It leans back, which can feel strange the first time." },
      { label: "The big light over the chair", why: "It's bright and shines toward the face." },
      { label: "The waiting area", why: "Where your child will wait before their turn." },
    ],
  },
  {
    keywords: ["haircut", "barber", "salon", "hair"],
    items: [
      { label: "The chair your child will sit in", why: "It may spin or go up and down." },
      { label: "The cape", why: "It goes around the neck, which some kids dislike." },
      { label: "The clippers or scissors", why: "Seeing them first makes them less surprising." },
      { label: "The mirror", why: "Your child may watch themselves the whole time." },
    ],
  },
  {
    keywords: ["school", "class", "kindergarten", "preschool", "daycare", "camp"],
    items: [
      { label: "The classroom", why: "Where most of the day happens." },
      { label: "Your child's cubby, hook or desk", why: "A spot that's theirs is reassuring." },
      { label: "The bathroom", why: "Knowing where it is matters a lot." },
      { label: "Where lunch happens", why: "Lunchrooms are often loud and busy." },
      { label: "The playground", why: "Recess is a big part of the day." },
      { label: "Where drop-off and pickup happen", why: "The goodbye and hello spot." },
    ],
  },
  {
    keywords: ["airport", "flight", "plane", "fly", "travel", "trip"],
    items: [
      { label: "The security line", why: "Lots of rules and noise; seeing it first helps." },
      { label: "The gate and its seats", why: "Where the waiting happens." },
      { label: "The inside of a plane", why: "A photo from the airline's website works well." },
    ],
  },
  {
    keywords: ["therapy", "therapist", "ot ", "occupational", "speech"],
    items: [
      { label: "The therapy room", why: "Where sessions happen." },
      { label: "Toys or equipment in the room", why: "Something familiar to look forward to." },
    ],
  },
];

function matchesKind(event: Event, keywords: string[]): boolean {
  const haystack = ` ${event.kind} ${event.title} `.toLowerCase();
  return keywords.some((k) => haystack.includes(k));
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function photoChecklist(event: Event, player: PlayerProfile): PhotoChecklist {
  const candidates: Array<Omit<PhotoSuggestion, "priority"> & { strong: boolean }> = [];
  const firstPlace = event.places[0];

  // 1. The entrance of the first place: the first thing your child sees.
  // Later places are usually rooms inside it (an exam room has no front door).
  for (const [i, place] of event.places.slice(0, 1).entries()) {
    if (place.photos.length) continue;
    candidates.push({
      id: `place-${place.id}-entrance`,
      label: `The outside or front door of ${place.name}`,
      why: "The first thing your child will see when you arrive.",
      tip: "Take it from where your child will first see it, like the parking lot or sidewalk.",
      attachTo: { kind: "place", id: place.id },
      strong: i === 0,
    });
  }

  // 2. People your child will meet. Familiar faces help the most.
  for (const person of event.people) {
    if (person.photo) continue;
    candidates.push({
      id: `person-${person.id}`,
      label: `${person.name}${person.role ? ` (${person.role})` : ""}`,
      why: "Seeing a face ahead of time makes meeting them easier.",
      tip: "Ask first. A friendly, shoulders-up photo is ideal. A photo from their website also works.",
      attachTo: { kind: "person", id: person.id },
      strong: true,
    });
  }

  // 3. The child's comfort items: a photo keeps them looking like the real one in every picture.
  for (const item of comfortsFor(event, player)) {
    if (item.photo) continue;
    candidates.push({
      id: `comfort-${item.id}`,
      label: `${item.name} (your child's comfort item)`,
      why: `So ${item.name} looks like the real one in every picture.`,
      tip: "Photograph it alone on a plain surface, like a table or a bed, in good light.",
      attachTo: { kind: "comfort", id: item.id },
      strong: true,
    });
  }

  // 4. Inside each place, if the steps happen there.
  for (const place of event.places) {
    if (!event.steps.some((s) => s.placeId === place.id)) continue;
    candidates.push({
      id: `place-${place.id}-inside`,
      label: `Inside ${place.name}`,
      why: place.sensoryNotes.length
        ? `Shows what it's like in there (${place.sensoryNotes.join(", ")}).`
        : "Shows what it's like in there before the day.",
      attachTo: { kind: "place", id: place.id },
      strong: place === firstPlace,
    });
  }

  // 5. Common extras for this kind of event.
  for (const group of KIND_EXTRAS) {
    if (!matchesKind(event, group.keywords)) continue;
    for (const item of group.items) {
      candidates.push({
        id: `extra-${slug(item.label)}`,
        label: item.label,
        why: item.why,
        attachTo: firstPlace ? { kind: "place", id: firstPlace.id } : { kind: "event" },
        strong: false,
      });
    }
  }

  // Remove duplicates, then fill "most helpful" in order up to the cap.
  const seen = new Set<string>();
  let mostHelpful = 0;
  const items: PhotoSuggestion[] = [];
  for (const { strong, ...item } of candidates) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const promote = strong && mostHelpful < MAX_MOST_HELPFUL;
    if (promote) mostHelpful++;
    items.push({ ...item, priority: promote ? "most-helpful" : "nice-to-have" });
  }

  // Most helpful first, keeping the order within each tier.
  items.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "most-helpful" ? -1 : 1));
  return { items, generalTips: GENERAL_PHOTO_TIPS };
}
