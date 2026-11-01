import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { NarrationFile, pageSpeechText, type Event, type NarrationPage, type Story } from "@socialstory/core";
import { DATA_DIR, imagesDir } from "./paths.js";

/**
 * Read-along recordings for one story, kept next to its pictures:
 *   .data/images/<story id>/narration.json   (timings, word help, voice)
 *   .data/images/<story id>/say-<key>.mp3    (one recording per page's words)
 */

export const ELEVEN_MODEL = "eleven_multilingual_v2";
/** The same calm, steady read as the interview questions. */
export const ELEVEN_SETTINGS = { stability: 0.75, similarity_boost: 0.75, style: 0, use_speaker_boost: true };

/** A recording's key: its exact words and the voice reading them. */
export const narrationKey = (text: string, voice: string) =>
  createHash("sha256").update(`${voice}\n${ELEVEN_MODEL}\n${text}`).digest("hex").slice(0, 12);

const narrationFile = (id: string, dataDir = DATA_DIR) => resolve(imagesDir(id, dataDir), "narration.json");

export function loadNarration(id: string, dataDir = DATA_DIR): NarrationFile | undefined {
  const file = narrationFile(id, dataDir);
  if (!existsSync(file)) return undefined;
  return NarrationFile.parse(JSON.parse(readFileSync(file, "utf8")));
}

export function saveNarration(id: string, narration: NarrationFile, dataDir = DATA_DIR) {
  writeFileSync(narrationFile(id, dataDir), JSON.stringify(narration, null, 2));
}

/** What each page of a story will say, in order (the first page also says its date and time). */
export function storySpeech(story: Story, event: Event): string[] {
  return story.pages.map((page, i) => pageSpeechText(page, i === 0 ? event.startsAt : undefined));
}

/** The saved recording whose words match this page exactly, if there is one. */
export function recordingFor(narration: NarrationFile | undefined, text: string): NarrationPage | undefined {
  if (!narration) return undefined;
  const hit = narration.pages[narrationKey(text, narration.voice)];
  return hit && hit.text === text ? hit : undefined;
}
