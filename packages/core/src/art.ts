import type { CastMember } from "./cast.js";
import type { StoryPage } from "./story.js";

/**
 * Prompts for Muse Image. Consistency comes from two things:
 * 1. one fixed style description used for every picture, and
 * 2. reference portraits of the cast passed in with every page.
 *
 * The style is sensory-safe on purpose (principle 4): muted colors,
 * plain backgrounds, soft light, calm faces, and no text in the image.
 */

export const ILLUSTRATED_STYLE = [
  "Soft children's picture-book illustration in gentle watercolor and colored pencil.",
  "Muted, warm, low-saturation colors. Soft, even lighting with no harsh shadows.",
  "Simple, uncluttered backgrounds with only the few objects the scene needs.",
  "Rounded, friendly shapes. Calm, relaxed facial expressions.",
  "No text, letters, numbers, signs with writing, logos or speech bubbles anywhere in the image.",
  "Nothing frightening: no needles shown up close, no blood, no crying, no angry or scary faces.",
].join(" ");

function describe(member: CastMember): string {
  return `${member.name}, ${member.role}${member.appearance ? `: ${member.appearance}` : ""}`;
}

/** A reference portrait for one cast member. Every page uses these to keep people consistent. */
export function buildCastPortraitPrompt(member: CastMember): string {
  return [
    `Character reference portrait of ${describe(member)}.`,
    "Full body, standing, facing forward, relaxed and friendly, alone on a plain pale cream background.",
    "No other people or objects.",
    ILLUSTRATED_STYLE,
  ].join("\n");
}

/**
 * The prompt for one story page. `references` are the cast members whose
 * portraits are attached, in the same order as the attached images.
 */
export function buildPagePrompt(page: StoryPage, references: CastMember[]): string {
  const scene = page.sceneBrief ?? page.sentences.map((s) => s.text).join(" ");
  const lines = [`Illustrate this scene for one page of a children's story: ${scene}`];

  if (references.length) {
    lines.push(
      "",
      `The attached images are character reference portraits, in this order: ${references
        .map((m, i) => `${i + 1}. ${m.name}`)
        .join("; ")}.`,
      "Each person in the scene must look exactly like their reference: same face, hair, skin tone, body and clothes.",
      `Show only these people: ${references.map((m) => m.name).join(", ")}. Do not add anyone else.`,
    );
  } else {
    lines.push("", "Show no people in this picture.");
  }

  lines.push("", ILLUSTRATED_STYLE);
  return lines.join("\n");
}

/** Cast members shown on a page, in a stable order. Unknown ids are skipped (the validator reports them). */
export function castOnPage(page: StoryPage, cast: CastMember[]): CastMember[] {
  return cast.filter((m) => page.inPicture.includes(m.id));
}
