import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { EMPTY_PROFILE_DRAFT } from "@socialstory/core";
import { interviewRoutes, type Listen } from "./interviewRoutes.js";

const post = (app: Hono, body: unknown) =>
  app.request("/api/interview/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

type Reply = { draft: typeof EMPTY_PROFILE_DRAFT; asked: string[]; next: { id: string; screen: string; spoken: string } | null; progress: { number: number; total: number } };

describe("profile interview route", () => {
  it("starts with the first bank question, free", async () => {
    let calls = 0;
    const app = new Hono().route("/api/interview", interviewRoutes({ listen: async () => { calls++; throw new Error(); } }));
    const r = (await (await post(app, {})).json()) as Reply;
    expect(r.next?.id).toBe("profile-name");
    expect(r.progress).toEqual({ number: 1, total: 12 });
    expect(calls).toBe(0);
  });

  it("fills the draft from an answer, skips what it covered, and strips diagnoses", async () => {
    let seen = "";
    const listen: Listen = async (prompt) => {
      seen = prompt.input;
      return { draft: { ...EMPTY_PROFILE_DRAFT, displayName: "Leo", age: 9, hardThings: ["loud-places"], otherHardThings: ["autism"] } };
    };
    const app = new Hono().route("/api/interview", interviewRoutes({ listen }));
    const r = (await (await post(app, { answer: { questionId: "profile-name", text: "Leo, he's 9 and autistic, loud places are hard" } })).json()) as Reply;
    expect(seen).toContain("Answer: Leo, he's 9 and autistic");
    expect(r.draft.otherHardThings).toEqual([]);
    expect(r.next?.id).toBe("profile-looks");
    expect(r.next?.screen).toContain("What does Leo look like?");
    expect(r.next?.spoken).toContain("your child");
    expect(r.progress.total).toBe(10); // age and hard were covered
  });

  it("doesn't call the model for 'I don't know', and doesn't ask again", async () => {
    let calls = 0;
    const app = new Hono().route("/api/interview", interviewRoutes({ listen: async () => { calls++; throw new Error(); } }));
    const draft = { ...EMPTY_PROFILE_DRAFT, displayName: "Leo" };
    const r = (await (await post(app, { draft, asked: ["profile-name"], answer: { questionId: "profile-looks", text: "I don't know" } })).json()) as Reply;
    expect(calls).toBe(0);
    expect(r.next?.id).toBe("profile-age");
    expect(r.asked).toEqual(["profile-name", "profile-looks"]);
  });

  it("ends when every question is asked or answered", async () => {
    const app = new Hono().route("/api/interview", interviewRoutes({ listen: async () => { throw new Error(); } }));
    const asked = ["profile-name", "profile-looks", "profile-age", "profile-reading", "profile-communication", "profile-hard", "profile-helps", "profile-comfort", "profile-loves", "profile-screen", "profile-ways-in"];
    const r = (await (await post(app, { draft: { ...EMPTY_PROFILE_DRAFT, displayName: "Leo" }, asked, answer: { questionId: "profile-anything-else", text: "no" } })).json()) as Reply;
    expect(r.next).toBeNull();
  });
});
