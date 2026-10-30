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

export const ILLUSTRATED_STYLE = [
  "Soft children's picture-book illustration in gentle watercolor and colored pencil.",
  "Muted, warm, low-saturation colors. Soft, even lighting with no harsh shadows.",
  "Simple, uncluttered backgrounds with only the few objects the scene needs.",
  "Rounded, friendly shapes. Calm, relaxed facial expressions.",
  "No text, letters, numbers, signs with writing, logos or speech bubbles anywhere in the image, including on books, magazines and walls.",
  "Nothing frightening: no needles shown up close, no blood, no crying, no angry or scary faces.",
].join(" ");

function describe(member: CastMember): string {
  return `${member.name}, ${member.role}${member.appearance ? `: ${member.appearance}` : ""}`;
}

/**
 * A reference portrait for one cast member. Every page uses these to keep
 * people and comfort items consistent. With `fromPhoto`, a real photo is
 * attached and the drawing must match it.
 */
export function buildCastPortraitPrompt(member: CastMember, options: { fromPhoto?: boolean } = {}): string {
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
  lines.push(ILLUSTRATED_STYLE);
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

  lines.push("", ILLUSTRATED_STYLE);
  return lines.join("\n");
}

/** Cast members shown on a page, in a stable order. Unknown ids are skipped (the validator reports them). */
export function castOnPage(page: StoryPage, cast: CastMember[]): CastMember[] {
  return cast.filter((m) => page.inPicture.includes(m.id));
}
