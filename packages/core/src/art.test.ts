import { describe, expect, it } from "vitest";
import { samplePlayer, sampleEvent, sampleStory, sampleUser } from "./fixtures.js";
import { castFor } from "./cast.js";
import { buildCastPortraitPrompt, buildPagePrompt, castOnPage } from "./art.js";
import { worldRulesFor } from "./region.js";

const cast = castFor(sampleEvent, samplePlayer);

describe("castFor", () => {
  it("lists the player, companions, people and comfort items, in that order", () => {
    expect(cast.map((m) => m.id)).toEqual(["player", "c-dad", "p-patel", "bear", "headphones"]);
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
    expect(refs.map((m) => m.name)).toEqual(["Sam", "Dad", "Dr. Patel", "Bear"]);
    expect(prompt).toContain("1. Sam; 2. Dad; 3. Dr. Patel; 4. Bear (an object)");
    expect(prompt).toContain("Do not add anyone else");
  });

  it("asks for no people when nobody is in the picture", () => {
    const page = { ...sampleStory.pages[0]!, inPicture: [] };
    expect(buildPagePrompt(page, [])).toContain("Show no people");
  });
});

describe("props and region", () => {
  it("includes comfort items in the cast as props, with the user's description", () => {
    const bear = cast.find((m) => m.id === "bear");
    const fixtureBear = samplePlayer.comforts.find((c) => c.id === "bear");
    expect(bear?.kind).toBe("prop");
    // Whatever the user wrote is what the illustrator gets; the test doesn't care what Bear is.
    expect(bear?.appearance).toBe(fixtureBear?.appearance);
    expect(buildCastPortraitPrompt(bear!)).toContain(fixtureBear!.appearance!);
  });

  it("draws props as objects, and from the photo when there is one", () => {
    const bear = cast.find((m) => m.id === "bear")!;
    expect(buildCastPortraitPrompt(bear)).toContain("Object reference drawing of Bear");
    expect(buildCastPortraitPrompt(bear, { fromPhoto: true })).toContain("Draw this exact object");
  });

  it("forbids swapping a comfort item for a different toy", () => {
    const shotPage = sampleStory.pages[3]!;
    const prompt = buildPagePrompt(shotPage, castOnPage(shotPage, cast));
    expect(prompt).toContain("4. Bear (an object)");
    expect(prompt).toContain("Do not replace it with a different toy");
    expect(prompt).toContain("Show only these people: Sam, Dad, Dr. Patel.");
  });

  it("puts the driver on the left in the US and on the right in the UK", () => {
    const us = worldRulesFor({ country: "US", drivesOn: "right" }).join(" ");
    const uk = worldRulesFor({ country: "GB", drivesOn: "left" }).join(" ");
    expect(us).toContain("the driver sits on the LEFT side");
    expect(uk).toContain("the driver sits on the RIGHT side");
    expect(us).toContain("Children ride in the back seat");
    // Oct 29: Sam was drawn facing backwards so his face pointed at the viewer.
    expect(us).toContain("Never draw a child sitting backwards");
  });

  it("sends the region rules with every page", () => {
    const page = sampleStory.pages[1]!;
    const prompt = buildPagePrompt(page, castOnPage(page, cast), worldRulesFor(sampleUser.region));
    expect(prompt).toContain("Real-world details:");
    expect(prompt).toContain("steering wheel on the left");
  });
});
