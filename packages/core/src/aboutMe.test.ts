import { describe, expect, it } from "vitest";
import { aboutMeEvent, buildStoryPrompt, castFor, photoChecklist, samplePlayer, storyView, type Event } from "./index.js";

describe("All about me ignores event-only details (Nov 3: Leo's story got a car)", () => {
  const base = aboutMeEvent(samplePlayer);
  // What a parent might fill in on the shared outline.
  const filledIn: Event = {
    ...base,
    transport: { mode: "car", name: "the car", appearance: "a light blue 4 door car" },
    places: [{ id: "pl-home", name: "home", photos: [], sensoryNotes: ["bright lights"] }],
    companions: [{ id: "c-mom", name: "Mom", facts: [] }],
    people: [{ id: "p-x", name: "Ms. Lee", role: "neighbour", facts: [] }],
    hardParts: [{ id: "h1", description: "Bright lights" }],
    steps: base.steps.map((s, i) => (i === 0 ? { ...s, placeId: "pl-home", personIds: ["c-mom"] } : s)),
  };

  it("draws only the child and their own things", () => {
    const ids = castFor(filledIn, samplePlayer).map((m) => m.id);
    expect(ids).toContain("player");
    expect(ids).not.toContain("transport");
    expect(ids).not.toContain("c-mom");
    expect(ids).not.toContain("p-x");
    // Comfort items stay: they're the child's own.
    expect(ids).toContain(samplePlayer.comforts[0]!.id);
  });

  it("never tells the writer about the car, places, hard parts or other people", () => {
    const prompt = buildStoryPrompt(filledIn, samplePlayer);
    const text = typeof prompt === "string" ? prompt : JSON.stringify(prompt);
    // (The writer's standing rules mention "the car" as an example; the event's own car must not appear.)
    expect(text).not.toContain("Getting there");
    expect(text).not.toContain("light blue 4 door");
    expect(text).not.toContain("Bright lights");
    expect(text).not.toContain("Ms. Lee");
    expect(text).not.toContain("[at home]");
  });

  it("suggests no place photos", () => {
    expect(photoChecklist(filledIn, samplePlayer).items.some((i) => i.attachTo.kind === "place")).toBe(false);
  });

  it("leaves every other event exactly as it is", () => {
    const visit = { ...filledIn, kind: "doctor" };
    expect(storyView(visit)).toBe(visit);
  });
});
