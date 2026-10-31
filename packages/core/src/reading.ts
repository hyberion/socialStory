import type { DetailLevel, ReadingLevel } from "./profile.js";
import type { Story } from "./story.js";

/**
 * Reading levels as numbers, so the same limits drive the writing prompt
 * and the check that the writer kept to them (one source of truth).
 */
export interface ReadingLimits {
  /** Sentences per page (each tagged sentence counts as one). */
  maxSentencesPerPage: number;
  /** Words in any one sentence. */
  maxWords: number;
  pages: [min: number, max: number];
}

export const READING_LIMITS: Record<ReadingLevel, ReadingLimits> = {
  "pre-verbal": { maxSentencesPerPage: 1, maxWords: 6, pages: [6, 8] },
  "early-reader": { maxSentencesPerPage: 3, maxWords: 9, pages: [6, 10] },
  reader: { maxSentencesPerPage: 4, maxWords: 15, pages: [8, 12] },
  "fluent-reader": { maxSentencesPerPage: 6, maxWords: 22, pages: [8, 14] },
};

/** Plain names for the user app. */
export const READING_LEVEL_LABELS: Record<ReadingLevel, string> = {
  "pre-verbal": "Listener (not reading yet)",
  "early-reader": "Early reader",
  reader: "Reader",
  "fluent-reader": "Fluent reader (older kids, teens and adults)",
};

export const DETAIL_LEVEL_LABELS: Record<DetailLevel, string> = {
  essentials: "Essentials",
  standard: "Standard",
  more: "More detail",
  full: "Full picture",
};

/** Words in a piece of text (anything with a letter or digit). */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length;
}

/** Splits one tagged sentence into real sentences ("We wait. It is noisy." is two). */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Rough syllable count for English; good enough for a readability estimate. */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, (trimmed.match(/[aeiouy]{1,2}/g) ?? []).length);
}

export interface Readability {
  /** Flesch-Kincaid grade, rounded to one decimal. */
  grade: number;
  /** "about kindergarten level", "about grade 2" */
  label: string;
  words: number;
}

/**
 * A rough reading-grade estimate (Flesch-Kincaid). Short texts make every
 * formula shaky, and it measures how hard the words are to read, not
 * whether a child understands them, so the app shows it as a rough guide,
 * never as a setting.
 */
export function readability(story: Story): Readability {
  const sentences = story.pages.flatMap((p) => p.sentences.flatMap((s) => splitSentences(s.text)));
  const words = sentences.flatMap((s) => s.split(/\s+/).filter((w) => /[a-z]/i.test(w)));
  if (!words.length || !sentences.length) return { grade: 0, label: "not enough text to tell", words: 0 };
  const syllables = words.reduce((n, w) => n + countSyllables(w), 0);
  const grade = 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59;
  const rounded = Math.round(grade * 10) / 10;
  const label = rounded < 1 ? "about kindergarten level" : `about grade ${Math.round(rounded)}`;
  return { grade: rounded, label, words: words.length };
}
