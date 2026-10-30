import { describe, expect, it } from "vitest";
import { samplePlayer, sampleEvent, sampleStory } from "./fixtures.js";
import { Event } from "./event.js";
import { Story, type StoryPage } from "./story.js";
import { validateStory } from "./validate.js";
import { castFor } from "./cast.js";

/** Builds a test story from hand-written pages; `inPicture` defaults to empty. */
function withPages(pages: Array<Omit<StoryPage, "inPicture"> & { inPicture?: string[] }>) {
  return { ...sampleStory, pages: pages.map((p) => ({ ...p, inPicture: p.inPicture ?? [] })) };
}

describe("fixtures", () => {
  it("sample event matches the schema", () => {
    expect(() => Event.parse(sampleEvent)).not.toThrow();
  });
  it("sample story matches the schema", () => {
    expect(() => Story.parse(sampleStory)).not.toThrow();
  });
});

describe("validateStory", () => {
  it("passes the sample story", () => {
    const result = validateStory(sampleStory);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.stats.coaching).toBe(2);
  });

  it("fails when coaching outweighs describing (Gray formula)", () => {
    const story = withPages([
      { section: "introduction", sentences: [{ text: "I go to school.", type: "descriptive" }] },
      {
        section: "body",
        sentences: [
          { text: "I can sit on the rug.", type: "coaching" },
          { text: "I can raise my hand.", type: "coaching" },
        ],
      },
      { section: "conclusion", sentences: [{ text: "Then I go home.", type: "descriptive" }] },
    ]);
    const result = validateStory(story);
    expect(result.ok).toBe(false);
    expect(result.issues.map((i) => i.code)).toContain("formula");
  });

  it("rejects compliance language and broken promises", () => {
    const story = withPages([
      { section: "introduction", sentences: [{ text: "I must sit still.", type: "descriptive" }] },
      { section: "body", sentences: [{ text: "The shot won't hurt.", type: "descriptive" }] },
      { section: "conclusion", sentences: [{ text: "Then I go home.", type: "descriptive" }] },
    ]);
    const codes = validateStory(story).issues.filter((i) => i.code === "banned-phrase");
    expect(codes).toHaveLength(2);
  });

  it("requires all six WH questions", () => {
    const result = validateStory({ ...sampleStory, answers: ["who", "what"] });
    expect(result.ok).toBe(false);
    expect(result.issues.filter((i) => i.code === "missing-wh")).toHaveLength(4);
  });

  it("requires introduction first and conclusion last", () => {
    const pages = [...sampleStory.pages].reverse();
    const result = validateStory(withPages(pages));
    expect(result.issues.filter((i) => i.code === "section-order")).toHaveLength(2);
  });

  it("warns, but does not fail, on second person", () => {
    const story = withPages([
      ...sampleStory.pages.slice(0, -1),
      { section: "conclusion", sentences: [{ text: "You did it.", type: "affirmative" }] },
    ]);
    const result = validateStory(story);
    expect(result.ok).toBe(true);
    expect(result.issues.map((i) => i.code)).toContain("second-person");
  });
});

describe("validateStory cast check", () => {
  const castIds = ["player", "c-dad", "p-patel", "bear", "headphones", "transport"];

  it("accepts pictures that show only listed people", () => {
    expect(validateStory(sampleStory, { castIds }).ok).toBe(true);
  });

  it("rejects a picture showing someone the user never listed", () => {
    const pages = sampleStory.pages.map((p, i) => (i === 1 ? { ...p, inPicture: ["player", "mom"] } : p));
    const result = validateStory({ ...sampleStory, pages }, { castIds });
    expect(result.ok).toBe(false);
    expect(result.issues.find((i) => i.code === "unknown-cast")?.page).toBe(1);
  });
});

describe("validateStory picture matching", () => {
  const cast = castFor(sampleEvent, samplePlayer);

  it("accepts the sample story, where every picture matches its description", () => {
    const result = validateStory(sampleStory, { cast });
    expect(result.issues.filter((i) => i.code === "picture-mismatch")).toEqual([]);
  });

  it("rejects Dr. Patel riding in the car when the description doesn't put her there (Oct 29 bug)", () => {
    const pages = sampleStory.pages.map((p, i) =>
      i === 1 ? { ...p, inPicture: ["player", "c-dad", "p-patel", "headphones"] } : p,
    );
    const issues = validateStory({ ...sampleStory, pages }, { cast }).issues.filter(
      (i) => i.code === "picture-mismatch",
    );
    expect(issues.map((i) => i.message).join(" ")).toContain("Dr. Patel");
    expect(issues.map((i) => i.message).join(" ")).toContain("headphones");
    expect(issues.every((i) => i.page === 1)).toBe(true);
  });

  it("rejects a description that names Bear when Bear isn't in the picture list", () => {
    const pages = sampleStory.pages.map((p, i) =>
      i === 2 ? { ...p, sceneBrief: "Sam and Dad wait near the fish tank. Sam holds Bear." } : p,
    );
    const issue = validateStory({ ...sampleStory, pages }, { cast }).issues.find(
      (i) => i.code === "picture-mismatch",
    );
    expect(issue?.message).toContain('mentions Bear, but "bear" is not in inPicture');
  });

  it("rejects pictures set inside a vehicle, but allows the car from outside (Oct 29)", () => {
    const at = (brief: string) =>
      validateStory(
        { ...sampleStory, pages: sampleStory.pages.map((p, i) => (i === 1 ? { ...p, sceneBrief: brief } : p)) },
        {},
      ).issues.filter((i) => i.code === "vehicle-inside");
    expect(at("Dad drives the car and Sam rides in the back seat.")).toHaveLength(1);
    expect(at("Sam sits inside the blue car with Bear.")).toHaveLength(1);
    expect(at("Sam and Dad walk to the blue car, parked on a quiet street.")).toEqual([]);
    expect(at("The blue car is parked outside the building with the blue door.")).toEqual([]);
    expect(at("Sam and Dad sit in the waiting room.")).toEqual([]);
  });

  it("matches names whole, so 'Sam' doesn't match 'Samantha'", () => {
    const pages = sampleStory.pages.map((p, i) =>
      i === 0 ? { ...p, sceneBrief: "A calendar on Samantha's wall." } : p,
    );
    const issue = validateStory({ ...sampleStory, pages }, { cast }).issues.find(
      (i) => i.code === "picture-mismatch" && i.page === 0,
    );
    expect(issue?.message).toContain("Picture lists Sam");
  });
});
