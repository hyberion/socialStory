import type { Event } from "./event.js";
import type { CastMember } from "./cast.js";
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
          "Full body, standing, facing forward, relaxed and friendly, alone on a plain pale cream background.",
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
  const step = page.stepId ? event.steps.find((s) => s.id === page.stepId) : undefined;
  if (!step) return undefined;
  const place = step.placeId ? event.places.find((p) => p.id === step.placeId) : undefined;
  return place ? `Indoors, inside ${place.name}. This moment: ${step.description}` : undefined;
}

export function buildPagePrompt(
  page: StoryPage,
  references: CastMember[],
  worldRules: string[] = [],
  setting?: string,
  look?: IllustrationLook,
): string {
  const scene = page.sceneBrief ?? page.sentences.map((s) => s.text).join(" ");
  const people = references.filter((m) => m.kind === "person");
  const props = references.filter((m) => m.kind === "prop");
  const lines = [`Illustrate this scene for one page of a children's story: ${scene}`];
  if (setting) lines.push(`Setting: ${setting} Draw the scene there, not outside.`);

  if (references.length) {
    lines.push(
      "",
      `The attached images are reference drawings, in this order: ${references
        .map((m, i) => `${i + 1}. ${m.name}${m.kind === "prop" ? " (an object)" : ""}`)
        .join("; ")}.`,
      "Everyone and everything shown must look exactly like its reference: same face, hair, skin tone, body and clothes for people; same shape and colors for objects.",
    );
  }
  lines.push(
    people.length
      ? `Show only these people: ${people.map((m) => m.name).join(", ")}. Do not add anyone else.`
      : "Show no people in this picture.",
  );
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
