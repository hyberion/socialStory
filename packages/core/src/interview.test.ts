import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE_DRAFT,
  PROFILE_QUESTIONS,
  buildProfileListenerPrompt,
  cleanProfileDraft,
  nextProfileQuestion,
  profileFromDraft,
  screenText,
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
  notes: "She likes to know who will be there. She was diagnosed last year.",
};

describe("question bank", () => {
  it("has unique ids, and generic audio that never names a child", () => {
    const ids = PROFILE_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of PROFILE_QUESTIONS) {
      expect(q.spoken).not.toContain("{name}");
      expect(q.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("starts with the name, then skips whatever an answer already covered", () => {
    expect(nextProfileQuestion(EMPTY_PROFILE_DRAFT, [])?.id).toBe("profile-name");
    // "Leo, he's 9, loud places are hard": looks is next, age and hard are skipped later.
    const d = { ...EMPTY_PROFILE_DRAFT, displayName: "Leo", age: 9, hardThings: ["loud-places" as const] };
    expect(nextProfileQuestion(d, ["profile-name"])?.id).toBe("profile-looks");
    const order: string[] = [];
    const asked = ["profile-name"];
    for (let q = nextProfileQuestion(d, asked); q; q = nextProfileQuestion(d, asked)) {
      order.push(q.id);
      asked.push(q.id);
    }
    expect(order).not.toContain("profile-age");
    expect(order).not.toContain("profile-hard");
    expect(order.at(-1)).toBe("profile-anything-else");
  });

  it("an 'I don't know' doesn't bring the question back", () => {
    expect(nextProfileQuestion({ ...EMPTY_PROFILE_DRAFT, displayName: "Leo" }, ["profile-name", "profile-looks"])?.id).toBe("profile-age");
  });

  it("shows the name on screen once it's known", () => {
    const looks = PROFILE_QUESTIONS[1]!;
    expect(screenText(looks, EMPTY_PROFILE_DRAFT)).toBe(looks.spoken);
    expect(screenText(looks, { ...EMPTY_PROFILE_DRAFT, displayName: "Ben" })).toContain("What does Ben look like?");
  });
});

describe("listening to answers", () => {
  it("never keeps a diagnosis, even if the model records one", () => {
    const clean = cleanProfileDraft(maya);
    expect(clean.otherHardThings).toEqual(["the hand dryer in bathrooms"]);
    expect(clean.helps).toEqual(["a countdown"]);
    expect(clean.notes).toBe("She likes to know who will be there.");
    expect(summarizeProfileDraft(maya).join(" ")).not.toMatch(/autism|ADHD|diagnosed/i);
  });

  it("turns a finished draft into a profile, keeping defaults for unknowns", () => {
    const p = profileFromDraft(maya);
    expect(p.displayName).toBe("Maya");
    expect(p.hardThings).toEqual(["crowds"]);
    expect(p.comforts[0]).toEqual({ id: "blue-blanket", name: "Blue Blanket", appearance: "a soft blue knitted blanket" });
    expect(p.screen).toEqual({ tap: true, drag: true, type: false });
    expect(p.notes).toBe("She likes to know who will be there.");
    expect(profileFromDraft({ ...maya, readingLevel: "unknown" }).readingLevel).toBe("early-reader");
  });

  it("gives the model the question, the answer, and the rules", () => {
    const { instructions, input } = buildProfileListenerPrompt({ ...EMPTY_PROFILE_DRAFT, displayName: "Sam" }, "profile-hard", "loud stuff");
    expect(instructions).toContain("Fill in every field the answer covers");
    expect(instructions).toContain("Never record a diagnosis");
    expect(input).toContain("Question: What's hard for Sam?");
    expect(input).toContain("Answer: loud stuff");
  });
});
