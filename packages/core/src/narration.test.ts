import { describe, expect, it } from "vitest";
import {
  KIT_FILE_PATTERN,
  cleanWordHelp,
  pageSpeechText,
  splitWords,
  wordAt,
  wordKey,
  wordsFromAlignment,
  type CharacterAlignment,
} from "./index.js";

/** A fake alignment: each character takes 0.1s, in order. */
function align(spoken: string): CharacterAlignment {
  const characters = [...spoken];
  return {
    characters,
    character_start_times_seconds: characters.map((_, i) => i * 0.1),
    character_end_times_seconds: characters.map((_, i) => (i + 1) * 0.1),
  };
}

describe("read-along word timings", () => {
  it("times each word from its letters", () => {
    const text = "I see Nurse Kim.";
    const words = wordsFromAlignment(text, align(text));
    expect(words).toHaveLength(4);
    // "see" is characters 2-4.
    expect(words[1]).toEqual({ start: 0.2, end: 0.5 });
    // "Kim." includes its full stop.
    expect(words[3]!.end).toBeCloseTo(1.6);
  });

  it("keeps the word count right when the voice spelled something differently", () => {
    const text = "Dr. Patel is kind.";
    // The service expanded "Dr." to "Doctor".
    const words = wordsFromAlignment(text, align("Doctor Patel is kind."));
    expect(words).toHaveLength(splitWords(text).length);
    expect(words[0]!.start).toBe(0);
    expect(words[0]!.end).toBeLessThanOrEqual(words[1]!.start);
    expect(words[1]!.start).toBeCloseTo(0.7);
  });

  it("finds the word being read, and holds it through the pause after", () => {
    const words = [
      { start: 0, end: 0.3 },
      { start: 0.5, end: 0.9 },
    ];
    expect(wordAt(words, 0.1)).toBe(0);
    expect(wordAt(words, 0.4)).toBe(0);
    expect(wordAt(words, 0.6)).toBe(1);
    expect(wordAt(words, 1.1)).toBe(1);
    expect(wordAt(words, 2)).toBe(-1);
  });

  it("reads the first page's date and time after its words", () => {
    const page = { sentences: [{ text: "We go to the doctor." }] };
    const text = pageSpeechText(page, "2026-11-10T10:00:00-05:00");
    expect(text.startsWith("We go to the doctor. ")).toBe(true);
    expect(text).toMatch(/Tuesday/);
    // The words on screen are the first ones the voice reads.
    expect(splitWords(text).slice(0, 5)).toEqual(splitWords("We go to the doctor."));
  });
});

describe("word help", () => {
  it("matches words without case or punctuation", () => {
    expect(wordKey("Nurse,")).toBe("nurse");
    expect(wordKey("“Stethoscope.”")).toBe("stethoscope");
  });

  it("keeps only words that are on the page, once each, at most three", () => {
    const help = cleanWordHelp("The nurse checks my blood pressure. The nurse is kind.", [
      { word: "Nurse", means: "A nurse helps the doctor." },
      { word: "nurse", means: "Again." },
      { word: "pressure", means: "How hard something pushes." },
      { word: "hospital", means: "Not on this page." },
    ]);
    expect(help.map((h) => h.word)).toEqual(["nurse", "pressure"]);
  });

  it("serves page recordings from a kit, and nothing else new", () => {
    expect(KIT_FILE_PATTERN.test("page-03.mp3")).toBe(true);
    expect(KIT_FILE_PATTERN.test("cast-bear.mp3")).toBe(false);
    expect(KIT_FILE_PATTERN.test("../page-03.mp3")).toBe(false);
  });
});
