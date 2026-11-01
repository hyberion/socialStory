import { describe, expect, it } from "vitest";
import { samplePlayer, sampleEvent, sampleStory, sampleUser } from "./fixtures.js";
import { castFor } from "./cast.js";
import { buildCastPortraitPrompt, buildPagePrompt, castOnPage, pageSetting } from "./art.js";
import { worldRulesFor } from "./region.js";

const cast = castFor(sampleEvent, samplePlayer);

describe("castFor", () => {
  it("lists the player, companions, people and comfort items, in that order", () => {
    expect(cast.map((m) => m.id)).toEqual(["player", "c-dad", "p-patel", "p-nurse", "bear", "headphones", "transport"]);
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
    expect(us).toContain("steering wheel is on the left");
    expect(uk).toContain("steering wheel is on the right");
    expect(us).toContain("back seat of a car, never the front");
    // Oct 29: car interiors kept coming out wrong (backwards child, booster on
    // the divider, no passenger seat), so pictures stay outside vehicles.
    expect(us).toContain("Never draw the inside of a car");
  });

  it("tells the illustrator where a page happens (Oct 29: waiting room drawn outdoors)", () => {
    const waiting = sampleStory.pages[2]!;
    const setting = pageSetting(waiting, sampleEvent);
    expect(setting).toBe("Indoors, inside Dr. Patel's office. This moment: We wait in the waiting room.");
    expect(buildPagePrompt(waiting, [], [], setting)).toContain("Setting: Indoors, inside Dr. Patel's office.");
    // The car page has no place, so no indoor setting.
    expect(pageSetting(sampleStory.pages[1]!, sampleEvent)).toBeUndefined();
  });

  it("sends the region rules with every page", () => {
    const page = sampleStory.pages[1]!;
    const prompt = buildPagePrompt(page, castOnPage(page, cast), worldRulesFor(sampleUser.region));
    expect(prompt).toContain("Real-world details:");
    expect(prompt).toContain("steering wheel is on the left");
  });
});

import { ILLUSTRATION_LOOKS, styleFor } from "./art.js";
import { PlayerProfile } from "./profile.js";

describe("illustration looks", () => {
  it("every look keeps the safety rules and names no studio", () => {
    for (const look of Object.keys(ILLUSTRATION_LOOKS) as Array<keyof typeof ILLUSTRATION_LOOKS>) {
      const s = styleFor(look);
      expect(s).toContain("No text, letters, numbers");
      expect(s).toContain("Nothing frightening");
      expect(s).not.toMatch(/pixar|disney|dreamworks|ghibli/i);
    }
  });
  it("the profile's choices match the looks, and pages use the chosen look", () => {
    expect(PlayerProfile.shape.illustrationLook.removeDefault().options.sort()).toEqual(Object.keys(ILLUSTRATION_LOOKS).sort());
    const page = sampleStory.pages[2]!;
    expect(buildPagePrompt(page, [], [], undefined, "clay")).toContain("clay and felt figures");
    expect(buildCastPortraitPrompt(cast[0]!, { look: "graphic" })).toContain("Graphic-novel");
  });
});
