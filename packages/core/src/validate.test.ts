import { describe, expect, it } from "vitest";
import { sampleEvent, sampleStory } from "./fixtures.js";
import { Event } from "./event.js";
import { Story, type StoryPage } from "./story.js";
import { validateStory } from "./validate.js";

function withPages(pages: StoryPage[]) {
  return { ...sampleStory, pages };
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
