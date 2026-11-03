import { describe, expect, it } from "vitest";
import { samplePlayer, sampleEvent, sampleStory, sampleUser } from "./fixtures.js";
import { castFor, playerRole } from "./cast.js";
import { buildCastPortraitPrompt, buildPagePrompt, castOnPage, pageSetting, placeForPage } from "./art.js";
import { worldRulesFor } from "./region.js";

const cast = castFor(sampleEvent, samplePlayer);

describe("castFor", () => {
  it("lists the player, companions, people and comfort items, in that order", () => {
    expect(cast.map((m) => m.id)).toEqual(["player", "c-dad", "p-patel", "p-nurse", "bear", "headphones", "transport"]);
    expect(cast[0]!.name).toBe("Sam");
  });
});

describe("the player's age in the pictures", () => {
  const today = new Date(2026, 10, 1);
  it("draws the player at their real age", () => {
    expect(playerRole({ ...samplePlayer, age: 26 }, today)).toContain("26-year-old adult");
    expect(playerRole({ ...samplePlayer, age: 15 }, today)).toContain("15-year-old teenager");
    expect(playerRole({ ...samplePlayer, age: 7 }, today)).toContain("7-year-old child");
    expect(playerRole({ ...samplePlayer, age: undefined, birthYear: 2000, birthMonth: 1 }, today)).toContain("26-year-old");
  });
  it("keeps the age on every page, not only the portrait (Nov 3)", () => {
    const me = castFor(sampleEvent, { ...samplePlayer, age: 26 }).find((m) => m.id === "player")!;
    const page = { ...sampleStory.pages[2]!, inPicture: ["player"] };
    expect(buildPagePrompt(page, [me])).toContain("1. Sam (the main character, a 26-year-old adult");
    expect(buildPagePrompt(page, [me])).toContain("Everyone wears shoes");
    expect(buildCastPortraitPrompt(me)).toContain("wearing everyday shoes");
  });

  it("falls back to 'the child' with no age", () => {
    expect(playerRole({ ...samplePlayer, age: undefined, birthYear: undefined }, today)).toBe("the child");
  });
  it("reaches the portrait prompt", () => {
    const me = castFor(sampleEvent, { ...samplePlayer, age: 26 }).find((m) => m.id === "player")!;
    expect(buildCastPortraitPrompt(me)).toContain("26-year-old adult");
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
    // Names in order, each person with their role (so ages hold), objects marked.
    expect(prompt).toMatch(/1\. Sam \(the main character, a 7-year-old child[^)]*\); 2\. Dad \([^)]+\); 3\. Dr\. Patel \([^)]+\); 4\. Bear \(an object\)/);
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
    // The car page comes before the first place: drawn outside the front entrance, never indoors (or inside the car).
    expect(pageSetting(sampleStory.pages[1]!, sampleEvent)).toMatch(/^Outside, at the front entrance of Dr. Patel's office\./);
  });

  it("handles a visit that starts inside, with the exam-table photo kept on the lab (Brad's lab test, Nov 2)", () => {
    const lab = {
      ...sampleEvent,
      places: [
        {
          id: "pl-office",
          name: "Quest lab",
          sensoryNotes: [],
          photos: [
            { id: "place-pl-office-entrance", src: "e/out.jpg" },
            { id: "place-pl-office-inside", src: "e/in.jpg" },
            { id: "extra-the-exam-table-with-its-paper-cover", src: "e/table.jpg" },
          ],
        },
        { id: "pl-exam", name: "the exam room", sensoryNotes: [], photos: [] },
      ],
      steps: [
        { id: "t1", description: "We go to the lab nurse's office.", placeId: "pl-office", personIds: [], fixed: false },
        { id: "t3", description: "We wait in the waiting room.", placeId: "pl-office", personIds: [], fixed: false },
        { id: "t5", description: "The nurse checks how tall I am.", placeId: "pl-exam", personIds: [], fixed: false },
      ],
    };
    const page = (stepId: string) => ({ ...sampleStory.pages[2]!, stepId });
    // "We go to..." as the first step: the arrival, at the entrance.
    expect(placeForPage(page("t1"), lab)).toMatchObject({ where: "entrance", photo: { id: "place-pl-office-entrance" } });
    // Waiting: the lab's own inside photo, not the exam table.
    expect(placeForPage(page("t3"), lab)?.photo?.id).toBe("place-pl-office-inside");
    // The exam room finds the exam-table photo even though it was kept on the lab.
    expect(placeForPage(page("t5"), lab)?.photo?.id).toBe("extra-the-exam-table-with-its-paper-cover");
    // The entrance page is drawn outdoors, without the "not outside" rule for rooms (Nov 3).
    const prompt = buildPagePrompt(page("t1"), [], [], pageSetting(page("t1"), lab));
    expect(prompt).toContain("Draw the scene outdoors, standing in front of the entrance");
    expect(prompt).not.toContain("not outside");
  });

  it("draws a page in the real place when the user photographed it (Nov 2)", () => {
    const withPhotos = {
      ...sampleEvent,
      places: sampleEvent.places.map((p) =>
        p.id === "pl-office"
          ? { ...p, photos: [{ id: "place-pl-office-entrance", src: "events/x/entrance.jpg" }, { id: "place-pl-office-inside", src: "events/x/inside.jpg" }] }
          : p,
      ),
    };
    const waiting = sampleStory.pages[2]!;
    const arrival = sampleStory.pages[1]!;
    // Inside: the room's photo, never the entrance's.
    expect(placeForPage(waiting, withPhotos)?.photo?.id).toBe("place-pl-office-inside");
    // Arriving: the entrance photo.
    expect(placeForPage(arrival, withPhotos)).toMatchObject({ where: "entrance", photo: { id: "place-pl-office-entrance" } });
    // No photo of the exam room: no photo, but still the setting.
    const exam = sampleStory.pages.find((p) => p.stepId && sampleEvent.steps.find((s) => s.id === p.stepId)?.placeId === "pl-exam");
    if (exam) expect(placeForPage(exam, withPhotos)?.photo).toBeUndefined();
    // Going home (after the places) has no place at all.
    const home = { ...waiting, stepId: "s4" };
    expect(placeForPage(home, withPhotos)).toBeUndefined();

    const prompt = buildPagePrompt(waiting, castOnPage(waiting, cast), [], pageSetting(waiting, withPhotos), undefined, "Dr. Patel's office");
    const n = castOnPage(waiting, cast).length;
    expect(prompt).toContain(`${n + 1}. a photo of the real Dr. Patel's office`);
    expect(prompt).toContain("Leave out every person, sign, logo, poster and piece of writing in that photo.");
    // Without a photo, nothing about one.
    expect(buildPagePrompt(waiting, [], [], pageSetting(waiting, sampleEvent))).not.toContain("photo");
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
      expect(s).toContain("never lighten or darken skin");
    }
  });
  it("the profile's choices match the looks, and pages use the chosen look", () => {
    expect(PlayerProfile.shape.illustrationLook.removeDefault().options.sort()).toEqual(Object.keys(ILLUSTRATION_LOOKS).sort());
    const page = sampleStory.pages[2]!;
    expect(buildPagePrompt(page, [], [], undefined, "clay")).toContain("clay and felt figures");
    expect(buildCastPortraitPrompt(cast[0]!, { look: "graphic" })).toContain("Graphic-novel");
  });
});
