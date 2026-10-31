import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE_DRAFT,
  buildProfileInterviewPrompt,
  cleanProfileDraft,
  profileFromDraft,
  summarizeProfileDraft,
} from "./interview.js";

const maya = {
  ...EMPTY_PROFILE_DRAFT,
  displayName: "Maya",
  age: 11,
  readingLevel: "reader" as const,
  communication: "aac" as const,
  hardThings: ["crowds" as const, "crowds" as const],
  otherHardThings: ["the hand dryer in bathrooms", "her autism"],
  helps: ["a countdown", "she has ADHD so short steps"],
  comforts: [{ name: "Blue Blanket", appearance: "a soft blue knitted blanket" }],
  canTap: "yes" as const,
  canDrag: "yes" as const,
};

describe("profile interview", () => {
  it("never keeps a diagnosis, even if the model records one", () => {
    const clean = cleanProfileDraft(maya);
    expect(clean.otherHardThings).toEqual(["the hand dryer in bathrooms"]);
    expect(clean.helps).toEqual(["a countdown"]);
    expect(summarizeProfileDraft(maya).join(" ")).not.toMatch(/autism|ADHD/i);
  });

  it("turns a finished draft into a profile, keeping defaults for unknowns", () => {
    const p = profileFromDraft(maya);
    expect(p.displayName).toBe("Maya");
    expect(p.age).toBe(11);
    expect(p.hardThings).toEqual(["crowds"]);
    expect(p.comforts[0]).toEqual({ id: "blue-blanket", name: "Blue Blanket", appearance: "a soft blue knitted blanket" });
    expect(p.screen).toEqual({ tap: true, drag: true, type: false });
    expect(p.detailLevel).toBe("standard");
    expect(p.waysIn).toEqual(["read", "listen"]);
    expect(profileFromDraft({ ...maya, readingLevel: "unknown" }).readingLevel).toBe("early-reader");
  });

  it("tells the model the rules that matter", () => {
    const { instructions, input } = buildProfileInterviewPrompt(EMPTY_PROFILE_DRAFT, [{ question: "Name?", answer: "Sam" }]);
    expect(instructions).toContain("Ask exactly one short");
    expect(instructions).toContain("Never record a diagnosis");
    expect(instructions).toContain("Record only what the user actually said");
    expect(input).toContain("A: Sam");
  });
});
