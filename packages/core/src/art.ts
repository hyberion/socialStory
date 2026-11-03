import type { Event, PhotoRef } from "./event.js";
import { PLAYER_CAST_ID, TRANSPORT_CAST_ID, type CastMember } from "./cast.js";
import type { StoryPage } from "./story.js";

/**
 * Prompts for Muse Image. Consistency comes from three things:
 * 1. one fixed style description used for every picture,
 * 2. reference portraits of the cast (people and comfort items) passed
 *    in with every page, and
 * 3. real-world rules for the user's region (which side the driver sits).
 *
 * The style is sensory-safe on purpose (principle 4): muted colors,
 * plain backgrounds, soft light, calm faces, and no text in the image.
 */

/**
 * Rules every look keeps, whatever it looks like (principle 4: sensory-safe).
 */
const ALWAYS = [
  // Nov 1 style test: watercolor drew Sam's brown skin noticeably lighter. Never again.
  "Keep each person's skin tone, hair and features exactly as described or as shown in their reference; never lighten or darken skin, in any style.",
  "Simple, uncluttered backgrounds with only the few objects the scene needs.",
  "Calm, relaxed, natural facial expressions; nothing exaggerated, wide-eyed or zany.",
  "No text, letters, numbers, signs with writing, logos or speech bubbles anywhere in the image, including on books, magazines and walls.",
  "Nothing frightening: no needles shown up close, no blood, no crying, no angry or scary faces.",
].join(" ");

/**
 * Illustration looks. Described, never named after a studio or artist (no
 * "Pixar-style"): a look isn't anyone's to own, but names are, and image
 * models often refuse prompts that use them.
 */
export const ILLUSTRATION_LOOKS = {
  watercolor: {
    label: "Soft watercolor",
    forWho: "A calm, warm default.",
    style: "Soft children's picture-book illustration in gentle watercolor and colored pencil. Muted, warm, low-saturation colors. Soft, even lighting with no harsh shadows. Rounded, friendly shapes.",
  },
  simple: {
    label: "Simple and clear",
    forWho: "Children who find busy pictures overwhelming.",
    style: "Simple flat illustration: clean shapes, solid flat colors, very little detail and no texture. Plain single-color backgrounds. Thin, even outlines. Muted, gentle colors.",
  },
  animated: {
    label: "3D animated look",
    forWho: "A familiar, engaging look, like modern animated films.",
    style: "Soft 3D-animated look like a modern family animated film: rounded shapes, smooth surfaces, warm soft lighting, gentle depth. Natural proportions and normal-sized eyes. Muted, warm colors.",
  },
  storybook: {
    label: "Classic storybook",
    forWho: "A traditional picture-book feel.",
    style: "Classic picture-book illustration: hand-drawn ink outlines with soft colored washes and a gentle paper texture. Muted, warm colors. Soft, even lighting.",
  },
  clay: {
    label: "Clay and felt",
    forWho: "A warm, handmade, tactile feel.",
    style: "Handmade clay and felt figures, like a gentle stop-motion film: soft matte textures, rounded handmade shapes, warm soft studio lighting. Muted, warm colors.",
  },
  realistic: {
    label: "Realistic",
    forWho: "Children who take cartoons too literally, or connect better with real-looking pictures.",
    style: "Realistic painterly illustration, close to a photograph but softly painted: natural proportions, natural muted colors, gentle even lighting.",
  },
  graphic: {
    label: "Graphic novel",
    forWho: "Teens and adults; nothing childish.",
    style: "Graphic-novel illustration for teens and adults: clean, confident ink lines, flat muted colors, simple shading, grounded and mature framing. Not cartoonish or childish.",
  },
  contrast: {
    label: "High contrast",
    forWho: "Low vision.",
    style: "High-contrast illustration for low vision: thick dark outlines, large simple shapes, strong separation between figures and a plain light background, a few clear colors.",
  },
} as const;
export type IllustrationLook = keyof typeof ILLUSTRATION_LOOKS;

/**
 * The looks offered to users (Nov 1, from the style test). The others stay
 * defined for later: storybook was nearly the same as watercolor, realistic
 * didn't come out realistic, and clay was the busiest page.
 */
export const OFFERED_LOOKS: IllustrationLook[] = ["watercolor", "simple", "animated", "graphic", "contrast"];
export const DEFAULT_LOOK: IllustrationLook = "watercolor";

/** The full style text for a look, with the rules every look keeps. */
export function styleFor(look: IllustrationLook = DEFAULT_LOOK): string {
  return `${ILLUSTRATION_LOOKS[look].style} ${ALWAYS}`;
}

/** The original watercolor style, kept for anything that doesn't choose a look. */
export const ILLUSTRATED_STYLE = styleFor("watercolor");

function describe(member: CastMember): string {
  return `${member.name}, ${member.role}${member.appearance ? `: ${member.appearance}` : ""}`;
}

/**
 * A reference portrait for one cast member. Every page uses these to keep
 * people and comfort items consistent. With `fromPhoto`, a real photo is
 * attached and the drawing must match it.
 */
export function buildCastPortraitPrompt(member: CastMember, options: { fromPhoto?: boolean; look?: IllustrationLook } = {}): string {
  const lines =
    member.kind === "prop"
      ? [
          `Object reference drawing of ${describe(member)}.`,
          "The object alone, centered, seen from the front, on a plain pale cream background. No people, no other objects.",
        ]
      : [
          `Character reference portrait of ${describe(member)}.`,
          "Full body, standing, facing forward, relaxed and friendly, wearing everyday shoes, alone on a plain pale cream background.",
          "No other people or objects.",
        ];
  if (options.fromPhoto) {
    lines.push(
      member.kind === "prop"
        ? "The attached photo shows the real object. Draw this exact object: same shape, colors, markings and details, in the illustration style below."
        : "The attached photo shows the real person. Keep their recognizable features, hair and clothing, in the illustration style below.",
    );
  }
  lines.push(styleFor(options.look));
  return lines.join("\n");
}

/**
 * The prompt for one story page. `references` are the cast members whose
 * portraits are attached, in the same order as the attached images.
 * `worldRules` come from the user's region (see worldRulesFor).
 */
/**
 * Where a page happens, from its step: "Inside Dr. Patel's office. We wait in
 * the waiting room." Oct 29: the waiting page came out outdoors because the
 * picture prompt never said where it was.
 */
export function pageSetting(page: StoryPage, event: Event): string | undefined {
  const at = placeForPage(page, event);
  if (!at) return undefined;
  return at.where === "inside"
    ? `Indoors, inside ${at.place.name}. This moment: ${at.step.description}`
    : `Outside, at the front entrance of ${at.place.name}. This moment: ${at.step.description}`;
}

/**
 * Where a page happens, and the user's photo of that spot if they took one.
 * A step with a place happens inside it (the room's photo, never the
 * entrance's). A step before the first one with a place is the arrival: it
 * happens at the front entrance of the first place (its entrance photo).
 * Steps after that with no place (going home) have none. Nov 2: so the drawn
 * waiting room looks like the real one.
 */
export function placeForPage(
  page: StoryPage,
  event: Event,
): { place: Event["places"][number]; step: Event["steps"][number]; where: "inside" | "entrance"; photo?: PhotoRef } | undefined {
  const index = page.stepId ? event.steps.findIndex((s) => s.id === page.stepId) : -1;
  const step = event.steps[index];
  if (!step) return undefined;
  const isEntrance = (ph: PhotoRef) => ph.id.endsWith("-entrance");
  const firstPlaced = event.steps.findIndex((s) => s.placeId);
  const first = event.places[0];
  const entrance = (place: Event["places"][number]) => ({ place, step, where: "entrance" as const, photo: place.photos.find(isEntrance) });

  // Before the first step with a place: arriving, at the first place's front entrance.
  if (!step.placeId) {
    if (!first || firstPlaced < 0 || index > firstPlaced) return undefined;
    return entrance(first);
  }
  const place = event.places.find((p) => p.id === step.placeId);
  if (!place) return undefined;
  // The very first step, when it's about getting there ("We go to the lab"), is the arrival too.
  if (index === firstPlaced && place.id === first?.id && ARRIVING.test(step.description)) return entrance(place);

  // Inside: this room's own photo first, then an extra about this room kept on another place
  // ("the exam table" for "the exam room"), then any other photo of it that isn't the entrance.
  const words = significantWords(place.name);
  const aboutThisRoom = (ph: PhotoRef) => ph.id.startsWith("extra-") && words.some((w) => ph.id.includes(w));
  const aboutAnotherRoom = (ph: PhotoRef) =>
    ph.id.startsWith("extra-") &&
    event.places.some((o) => o.id !== place.id && significantWords(o.name).some((w) => ph.id.includes(w)));
  const photo =
    place.photos.find((ph) => ph.id.endsWith("-inside")) ??
    event.places.flatMap((p) => p.photos).find(aboutThisRoom) ??
    place.photos.find((ph) => !isEntrance(ph) && !aboutAnotherRoom(ph));
  return { place, step, where: "inside", photo };
}

/** Words that mean "we're on our way" or "we've just got there". */
const ARRIVING = /\b(go to|going to|get to|drive to|walk to|ride to|arrive|arrives|come to|walk in|go in|go inside|front door)\b/i;

/** "the exam room" -> ["exam", "room"]: the words that pick a room out (longer than 3 letters). */
const significantWords = (name: string) =>
  name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && w !== "room" && w !== "office");

export function buildPagePrompt(
  page: StoryPage,
  references: CastMember[],
  worldRules: string[] = [],
  setting?: string,
  look?: IllustrationLook,
  /** The name of the place whose real photo is attached after the cast portraits. */
  placePhotoOf?: string,
): string {
  const scene = page.sceneBrief ?? page.sentences.map((s) => s.text).join(" ");
  const people = references.filter((m) => m.kind === "person");
  const props = references.filter((m) => m.kind === "prop");
  const lines = [`Illustrate this scene for one page of an illustrated story: ${scene}`];
  // Nov 3: "not outside" was added to every setting, so the entrance page came out inside the lobby.
  if (setting)
    lines.push(
      setting.startsWith("Outside")
        ? `Setting: ${setting} Draw the scene outdoors, standing in front of the entrance, not inside the building.`
        : `Setting: ${setting} Draw the scene there, not outside.`,
    );

  if (references.length || placePhotoOf) {
    const listed = [
      // Each person's role goes with their name, so their age holds on every page
      // (Nov 3: Benjamin, 26, came out as a small child when sitting beside Dad).
      ...references.map((m, i) => `${i + 1}. ${m.name}${m.kind === "prop" ? " (an object)" : m.role ? ` (${m.role})` : ""}`),
      ...(placePhotoOf ? [`${references.length + 1}. a photo of the real ${placePhotoOf}`] : []),
    ];
    lines.push("", `The attached images are, in this order: ${listed.join("; ")}.`);
  }
  if (references.length) {
    lines.push(
      "Everyone and everything shown must look exactly like its reference drawing: same face, hair, skin tone, body and clothes for people; same shape and colors for objects.",
    );
  }
  if (placePhotoOf) {
    lines.push(
      `Draw the scene in the place shown in the photo of ${placePhotoOf}: keep its layout, furniture, colors, windows and doors, redrawn in the illustration style below, not as a photo.`,
      "Leave out every person, sign, logo, poster and piece of writing in that photo.",
    );
  }
  lines.push(
    people.length
      ? `Show only these people: ${people.map((m) => m.name).join(", ")}. Do not add anyone else. Everyone wears shoes unless the scene says otherwise.`
      : "Show no people in this picture.",
  );
  // Relative size (Nov 3: Benjamin, 26, shrank to child size sitting beside Dad; the pickup came out toy-sized).
  const player = people.find((m) => m.id === PLAYER_CAST_ID);
  const stage = player?.role.match(/(\d+)-year-old (child|teenager|adult)/)?.[2];
  if (player && stage && people.length > 1) {
    lines.push(
      stage === "adult"
        ? `${player.name} is fully grown: draw them at adult height, about as tall as the other adults, on every page.`
        : stage === "teenager"
          ? `${player.name} is a teenager: nearly adult height, a little shorter than the adults.`
          : `${player.name} is a child: smaller than the adults beside them.`,
    );
  }
  if (props.some((m) => m.id === TRANSPORT_CAST_ID)) {
    lines.push("Draw the vehicle at its real, full size, bigger than the people beside it, never toy-sized.");
  }
  if (props.length) {
    lines.push(
      `Include ${props.map((m) => m.name).join(" and ")} exactly as referenced. Do not replace ${
        props.length === 1 ? "it" : "them"
      } with a different toy or object.`,
    );
  }
  if (worldRules.length) lines.push("", "Real-world details:", ...worldRules.map((r) => `- ${r}`));

  lines.push("", styleFor(look));
  return lines.join("\n");
}

/** Cast members shown on a page, in a stable order. Unknown ids are skipped (the validator reports them). */
export function castOnPage(page: StoryPage, cast: CastMember[]): CastMember[] {
  return cast.filter((m) => page.inPicture.includes(m.id));
}
