import { describe, expect, it } from "vitest";
import { samplePlayer, sampleEvent, sampleStory } from "./fixtures.js";
import { castFor } from "./cast.js";
import { buildCastPortraitPrompt, buildPagePrompt, castOnPage } from "./art.js";

const cast = castFor(sampleEvent, samplePlayer);

describe("castFor", () => {
  it("lists the player, companions and people, in that order", () => {
    expect(cast.map((m) => m.id)).toEqual(["player", "c-dad", "p-patel"]);
    expect(cast[0]!.name).toBe("Sam");
  });
});

describe("art prompts", () => {
  it("puts the appearance in the cast portrait", () => {
    const prompt = buildCastPortraitPrompt(cast[2]!);
    expect(prompt).toContain("Dr. Patel");
    expect(prompt).toContain("white coat");
    expect(prompt).toContain("No text");
  });

  it("names the attached references in order and forbids extra people", () => {
    const shotPage = sampleStory.pages[3]!;
    const refs = castOnPage(shotPage, cast);
    const prompt = buildPagePrompt(shotPage, refs);
    expect(refs.map((m) => m.name)).toEqual(["Sam", "Dad", "Dr. Patel"]);
    expect(prompt).toContain("1. Sam; 2. Dad; 3. Dr. Patel");
    expect(prompt).toContain("Do not add anyone else");
  });

  it("asks for no people when nobody is in the picture", () => {
    const page = { ...sampleStory.pages[0]!, inPicture: [] };
    expect(buildPagePrompt(page, [])).toContain("Show no people");
  });
});
