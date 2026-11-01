import { describe, expect, it } from "vitest";
import {
  KIT_FILE_PATTERN,
  pageSpeechWithPauses,
  spokenDate,
  spokenTime,
  wallClock,
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

describe("what the voice says", () => {
  const at = (iso: string) => wallClock(iso)!;
  it("spells out the date and time the way they're said", () => {
    expect(spokenDate(at("2026-11-03T10:00:00-05:00"))).toBe("Tuesday, November third");
    expect(spokenDate(at("2026-11-22T10:00:00-05:00"))).toBe("Sunday, November twenty-second");
    expect(spokenDate(at("2026-11-30T10:00:00-05:00"))).toBe("Monday, November thirtieth");
    expect(spokenTime(at("2026-11-03T10:00:00-05:00"))).toBe("ten o'clock in the morning");
    expect(spokenTime(at("2026-11-03T14:30:00-05:00"))).toBe("two thirty in the afternoon");
    expect(spokenTime(at("2026-11-03T09:05:00-05:00"))).toBe("nine oh five in the morning");
    expect(spokenTime(at("2026-11-03T12:00:00-05:00"))).toBe("twelve o'clock, noon");
  });

  it("pauses after each sentence, and the pauses don't throw off the word timings", () => {
    const page = { sentences: [{ text: "I see Kim." }, { text: "Kim waves." }] };
    const sent = pageSpeechWithPauses(page);
    expect(sent).toBe('I see Kim. <break time="0.7s" /> Kim waves.');
    const plain = pageSpeechText(page);
    const words = wordsFromAlignment(plain, align(sent));
    expect(words).toHaveLength(5);
    // "Kim" in "Kim waves." starts after the pause tag (character 31 of what was sent).
    expect(words[3]!.start).toBeCloseTo(sent.indexOf("Kim waves") * 0.1);
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
