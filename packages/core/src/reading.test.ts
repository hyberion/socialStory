import { describe, expect, it } from "vitest";
import { countSyllables, countWords, readability, splitSentences } from "./reading.js";
import { validateStory } from "./validate.js";
import { buildStoryPrompt } from "./prompts.js";
import { sampleEvent, samplePlayer, sampleStory } from "./fixtures.js";

const withPage2 = (texts: string[]) => ({
  ...sampleStory,
  pages: sampleStory.pages.map((p, i) => (i === 1 ? { ...p, sentences: texts.map((text) => ({ text, type: "descriptive" as const })) } : p)),
});

describe("reading level check", () => {
  it("passes the sample story for an early reader", () => {
    const codes = validateStory(sampleStory, { readingLevel: "early-reader" }).issues.map((i) => i.code);
    expect(codes.filter((c) => c === "reading-level" )).toEqual(["reading-level"]); // only the page-count warning (5 pages)
    expect(validateStory(sampleStory, { readingLevel: "early-reader" }).ok).toBe(true);
  });

  it("catches too many sentences on a page and too many words in one", () => {
    const story = withPage2(["One.", "Two.", "Three.", "Four."]);
    expect(validateStory(story, { readingLevel: "early-reader" }).issues.some((i) => i.message.includes("4 sentences"))).toBe(true);
    const long = withPage2(["Dad and I drive in the blue car to the big building."]); // 12 words
    const issue = validateStory(long, { readingLevel: "early-reader" }).issues.find((i) => i.message.includes("words;"));
    expect(issue?.severity).toBe("error");
    expect(validateStory(long, { readingLevel: "reader" }).issues.some((i) => i.message.includes("words;"))).toBe(false);
    // One or two words over is only a note, so it doesn't cost a rewrite.
    const close = withPage2(["Dad and I drive to the big blue door now."]); // 10 words
    expect(validateStory(close, { readingLevel: "early-reader" }).issues.find((i) => i.message.includes("words;"))?.severity).toBe("warning");
  });

  it("counts each real sentence inside a tagged sentence", () => {
    expect(splitSentences("Waiting can feel long. That is okay.")).toEqual(["Waiting can feel long.", "That is okay."]);
    expect(countWords("Dr. Patel's office — it's big!")).toBe(5);
  });
});

describe("readability estimate", () => {
  it("rates simple stories low and harder text higher", () => {
    expect(countSyllables("doctor")).toBe(2);
    expect(readability(sampleStory).grade).toBeLessThan(3);
    const hard = withPage2(["The examination requires considerable patience, particularly during unexpectedly prolonged appointments."]);
    expect(readability(hard).grade).toBeGreaterThan(readability(sampleStory).grade);
  });
});

describe("detail level", () => {
  it("puts the detail rule and the reading limits in the prompt", () => {
    const essentials = buildStoryPrompt(sampleEvent, { ...samplePlayer, detailLevel: "essentials" }).instructions;
    const full = buildStoryPrompt(sampleEvent, { ...samplePlayer, detailLevel: "full", readingLevel: "fluent-reader" }).instructions;
    expect(essentials).toContain("Detail: essentials only");
    expect(essentials).toContain("each at most 9 words");
    expect(full).toContain("honest, general what-ifs");
    expect(full).toContain("Nothing babyish");
  });
});

describe("profile in the prompt", () => {
  it("describes hard things and what helps, and adapts choices for kids who don't speak much", () => {
    const sam = buildStoryPrompt(sampleEvent, samplePlayer).instructions;
    expect(sam).toContain("Things that are hard for this child: sudden noises, waiting.");
    expect(sam).toContain("Never add one that the event details don't include.");
    expect(sam).toContain("knowing what comes next; holding Bear");
    expect(sam).toContain("Never write choices that depend on speaking");
    const talker = buildStoryPrompt(sampleEvent, { ...samplePlayer, communication: "full-sentences", hardThings: [], helps: [] }).instructions;
    expect(talker).not.toContain("Things that are hard");
    expect(talker).not.toContain("depend on speaking");
  });
});

import { currentAge, suggestFromAge } from "./onboarding.js";

describe("age", () => {
  const oct31 = new Date(2026, 9, 31);
  it("keeps up by itself from birth month and year", () => {
    expect(currentAge({ birthYear: 2000, birthMonth: 3 }, oct31)).toBe(26);
    expect(currentAge({ birthYear: 2000, birthMonth: 12 }, oct31)).toBe(25); // birthday not yet this year
    expect(currentAge({ birthYear: 2019 }, oct31)).toBe(7);
  });
  it("falls back to a typed age, and works for adults", () => {
    expect(currentAge({ age: 26 })).toBe(26);
    expect(currentAge({})).toBeUndefined();
    expect(suggestFromAge(26).readingLevel).toBe("fluent-reader");
  });
});
