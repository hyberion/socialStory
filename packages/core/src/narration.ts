import { z } from "zod";
import type { ReadingLevel } from "./profile.js";
import { READING_LEVEL_LABELS } from "./reading.js";
import { dateWords, timeWords, wallClock } from "./when.js";

/**
 * Read-along narration. Each page is read by a recorded voice (ElevenLabs);
 * the voice service also returns when each letter is spoken, which becomes
 * when each word is spoken. The player highlights the word being read, and
 * tapping a word plays just that word, cut from the page's own recording.
 *
 * Words are matched by position: the page's text split on spaces, in order.
 * The player splits the same text the same way, so word 5 on screen is
 * word 5 in the timings. Words read after the page text (the date and time
 * on the first page, shown as a calendar) have timings but no word on screen.
 */

export const WordTiming = z.object({
  /** Seconds from the start of the page's recording. */
  start: z.number().min(0),
  end: z.number().min(0),
});
export type WordTiming = z.infer<typeof WordTiming>;

/** A word a child at this reading level may not know, with a plain meaning. */
export const WordHelp = z.object({
  /** The word as it appears on the page, lower case, no punctuation: "nurse". */
  word: z.string().min(1),
  /** One short, literal sentence: "A nurse is a person who helps the doctor take care of you." */
  means: z.string().min(1),
});
export type WordHelp = z.infer<typeof WordHelp>;

export const KitNarration = z.object({
  /** File name of the page's recording inside the kit, e.g. "page-01.mp3". */
  audio: z.string(),
  words: z.array(WordTiming),
  help: z.array(WordHelp).default([]),
});
export type KitNarration = z.infer<typeof KitNarration>;

/**
 * What `pnpm narrate` saves next to a story's pictures. Recordings are kept by
 * a fingerprint of their words and voice, not by page number, so moving pages
 * in the editor never mixes them up; publishing finds each page's recording by
 * its current words.
 */
export const NarrationPage = KitNarration.extend({
  /** The exact text that was read. Publishing only uses it if the page still says this. */
  text: z.string(),
});
export type NarrationPage = z.infer<typeof NarrationPage>;

export const NarrationFile = z.object({
  voice: z.string(),
  model: z.string(),
  pages: z.record(z.string(), NarrationPage).default({}),
});
export type NarrationFile = z.infer<typeof NarrationFile>;

/** The words of a piece of text, the same way on the server and in the player. */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** "Nurse," -> "nurse": how a word on the page is matched to its help. */
export function wordKey(word: string): string {
  return word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

/**
 * Everything the voice reads for a page: its sentences, then (first page
 * only) the date and time that the calendar and clock show.
 */
export function pageSpeechText(page: { sentences: Array<{ text: string }> }, when?: string): string {
  const parts = page.sentences.map((s) => s.text.trim());
  const t = when ? wallClock(when) : undefined;
  if (t) parts.push(`${dateWords(t)}.`, `${timeWords(t)}.`);
  return parts.join(" ");
}

/** ElevenLabs' "alignment": one entry per character of what it read. */
export interface CharacterAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/**
 * Word timings from letter timings. The alignment normally spells the text
 * exactly; if the voice service changed a character or two (it can expand
 * "Dr." or numbers), each word is found by searching ahead, and a word that
 * can't be found is placed between its neighbours so the count still matches.
 */
export function wordsFromAlignment(text: string, alignment: CharacterAlignment): WordTiming[] {
  const spoken = alignment.characters.join("");
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  const words = splitWords(text);
  const found: Array<WordTiming | undefined> = [];
  let cursor = 0;
  for (const word of words) {
    const at = spoken.indexOf(word, cursor);
    // Don't jump far ahead to a later copy of the same word.
    if (at >= 0 && at - cursor <= 12 + word.length) {
      found.push({ start: starts[at] ?? 0, end: ends[at + word.length - 1] ?? starts[at] ?? 0 });
      cursor = at + word.length;
    } else {
      found.push(undefined);
    }
  }
  // Fill any gaps by sharing the time between the known words around them.
  const total = ends[ends.length - 1] ?? 0;
  for (let i = 0; i < found.length; i++) {
    if (found[i]) continue;
    let j = i;
    while (j < found.length && !found[j]) j++;
    const from = i > 0 ? found[i - 1]!.end : 0;
    const to = j < found.length ? found[j]!.start : total;
    const step = (to - from) / (j - i);
    for (let k = i; k < j; k++) found[k] = { start: from + step * (k - i), end: from + step * (k - i + 1) };
    i = j - 1;
  }
  return found.map((w) => ({ start: round(w!.start), end: round(Math.max(w!.end, w!.start)) }));
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Which word is being read at a moment in the recording, or -1 between words. */
export function wordAt(words: WordTiming[], seconds: number): number {
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    const next = words[i + 1];
    // A word stays lit through the small pause after it, until the next starts.
    if (seconds >= w.start && seconds < (next ? next.start : w.end + 0.3)) return i;
  }
  return -1;
}

/**
 * The instructions for word help: Spark picks the words on each page that
 * a reader at this level may not know, and explains them literally.
 */
export function buildWordHelpPrompt(pages: string[], readingLevel: ReadingLevel): string {
  return [
    `These are the pages of a short story for one reader. Their reading level: ${READING_LEVEL_LABELS[readingLevel]}.`,
    "For each page, pick up to 3 words on that page that this reader may not know yet (names of places, people's jobs, medical or school words). Skip everyday words and people's names.",
    "For each word, write one short sentence saying what it means, in words this reader knows.",
    "Rules for the meanings: literal and true; no idioms or figures of speech; no promises (never say something won't hurt); calm and plain.",
    "Give each word exactly as it is spelled on the page, in lower case, without punctuation. If a page has no such words, give it an empty list.",
    "",
    ...pages.map((p, i) => `Page ${i + 1}: ${p}`),
  ].join("\n");
}

export const WordHelpReply = z.object({
  pages: z.array(z.object({ page: z.number().int(), words: z.array(WordHelp) })),
});
export type WordHelpReply = z.infer<typeof WordHelpReply>;

/** Keeps only help for words actually on the page (the model can drift). */
export function cleanWordHelp(text: string, help: WordHelp[]): WordHelp[] {
  const onPage = new Set(splitWords(text).map(wordKey));
  const seen = new Set<string>();
  return help
    .map((h) => ({ word: wordKey(h.word), means: h.means.trim() }))
    .filter((h) => h.word && h.means && onPage.has(h.word) && !seen.has(h.word) && seen.add(h.word))
    .slice(0, 3);
}
