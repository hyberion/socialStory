import {
  DESCRIBING_TYPES,
  WhQuestion,
  type Story,
  type StorySection,
} from "./story.js";

/**
 * Checks a story against the parts of Gray's criteria (and our own
 * principles) that can be checked mechanically. A failing story goes
 * back to the writer model with the issues attached; it never reaches
 * the parent as-is.
 */

export type Severity = "error" | "warning";

export interface Issue {
  severity: Severity;
  code: string;
  message: string;
  /** 0-based page index, when the issue is on a specific page. */
  page?: number;
}

export interface ValidationResult {
  ok: boolean;
  issues: Issue[];
  stats: {
    describing: number;
    coaching: number;
    /** describing / coaching; Infinity when there is no coaching. */
    ratio: number;
  };
}

/** Gray's formula: describing sentences should outnumber coaching at least 2 to 1. */
export const MIN_DESCRIBING_RATIO = 2;

/**
 * Phrases that script compliance or make promises the world can break.
 * Matched case-insensitively on word boundaries.
 */
const BANNED_PHRASES: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bmust\b/i, reason: "dictates behavior (principle 2)" },
  { pattern: /\bhave to\b/i, reason: "dictates behavior (principle 2)" },
  { pattern: /\bhas to\b/i, reason: "dictates behavior (principle 2)" },
  { pattern: /\bnot allowed\b/i, reason: "dictates behavior (principle 2)" },
  { pattern: /\bbe (a )?good (boy|girl)\b/i, reason: "compliance framing" },
  { pattern: /\bwon'?t hurt\b/i, reason: "promise the world can break" },
  { pattern: /\bdoesn'?t hurt\b/i, reason: "promise the world can break" },
  { pattern: /\bnothing to (be )?(scared|afraid|worried) (of|about)\b/i, reason: "dismisses feelings" },
  { pattern: /\bdon'?t (be )?(scared|afraid|worry|cry)\b/i, reason: "dismisses feelings" },
  { pattern: /\balways\b/i, reason: "absolute claim; prefer 'usually' or 'often'" },
  { pattern: /\bnever\b/i, reason: "absolute claim; prefer 'usually' or 'often'" },
];

/** Gray avoids second person ("you"). We flag it as a warning, not an error. */
const SECOND_PERSON = /\byou(r|rs|rself)?\b/i;

export function validateStory(story: Story): ValidationResult {
  const issues: Issue[] = [];

  // Criterion 3: title + introduction + body + conclusion.
  const sections = new Set<StorySection>(story.pages.map((p) => p.section));
  for (const required of ["introduction", "body", "conclusion"] as const) {
    if (!sections.has(required)) {
      issues.push({
        severity: "error",
        code: "missing-section",
        message: `Story has no ${required}.`,
      });
    }
  }
  const first = story.pages[0];
  const last = story.pages[story.pages.length - 1];
  if (first && first.section !== "introduction") {
    issues.push({ severity: "error", code: "section-order", message: "Story must open with the introduction." });
  }
  if (last && last.section !== "conclusion") {
    issues.push({ severity: "error", code: "section-order", message: "Story must end with the conclusion." });
  }

  // Criterion 6: all six WH questions answered.
  const answered = new Set(story.answers);
  for (const q of WhQuestion.options) {
    if (!answered.has(q)) {
      issues.push({
        severity: "error",
        code: "missing-wh",
        message: `Story does not answer "${q}".`,
      });
    }
  }

  // Criteria 7 and 8: sentence types and the describing-to-coaching formula.
  let describing = 0;
  let coaching = 0;
  story.pages.forEach((page, pageIndex) => {
    for (const sentence of page.sentences) {
      if (DESCRIBING_TYPES.includes(sentence.type)) describing++;
      else coaching++;

      // Criterion 1 and principle 2: inform, don't dictate.
      for (const { pattern, reason } of BANNED_PHRASES) {
        if (pattern.test(sentence.text)) {
          issues.push({
            severity: "error",
            code: "banned-phrase",
            message: `"${sentence.text}": ${reason}.`,
            page: pageIndex,
          });
        }
      }

      // Criterion 5 (voice): first or third person.
      if (SECOND_PERSON.test(sentence.text)) {
        issues.push({
          severity: "warning",
          code: "second-person",
          message: `"${sentence.text}": uses second person; prefer first or third.`,
          page: pageIndex,
        });
      }
    }
  });

  const ratio = coaching === 0 ? Number.POSITIVE_INFINITY : describing / coaching;
  if (ratio < MIN_DESCRIBING_RATIO) {
    issues.push({
      severity: "error",
      code: "formula",
      message: `Describing-to-coaching ratio is ${ratio.toFixed(2)}; needs at least ${MIN_DESCRIBING_RATIO}.`,
    });
  }

  return {
    ok: !issues.some((i) => i.severity === "error"),
    issues,
    stats: { describing, coaching, ratio },
  };
}
