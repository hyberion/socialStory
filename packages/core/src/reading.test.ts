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
