import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { EMPTY_PROFILE_DRAFT, PROFILE_OPENING_QUESTION } from "@socialstory/core";
import { interviewRoutes, type AskNext } from "./interviewRoutes.js";

const post = (app: Hono, body: unknown) =>
  app.request("/api/interview/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("profile interview route", () => {
  it("opens with a fixed question without calling the model", async () => {
    let calls = 0;
    const app = new Hono().route("/api/interview", interviewRoutes({ askNext: async () => { calls++; throw new Error(); } }));
    const reply = (await (await post(app, {})).json()) as { nextQuestion: string };
    expect(reply.nextQuestion).toBe(PROFILE_OPENING_QUESTION);
    expect(calls).toBe(0);
  });

  it("passes the conversation to the model and strips any diagnosis it records", async () => {
    let seen = "";
    const askNext: AskNext = async (prompt) => {
      seen = prompt.input;
      return {
        draft: { ...EMPTY_PROFILE_DRAFT, displayName: "Sam", otherHardThings: ["autism", "the vacuum"] },
        nextQuestion: "What does Sam look like?",
        done: false,
      };
    };
    const app = new Hono().route("/api/interview", interviewRoutes({ askNext }));
    const reply = (await (await post(app, { turns: [{ question: PROFILE_OPENING_QUESTION, answer: "Sam, he's autistic" }] })).json()) as {
      draft: { displayName: string; otherHardThings: string[] };
      nextQuestion: string;
    };
    expect(seen).toContain("A: Sam, he's autistic");
    expect(reply.draft.displayName).toBe("Sam");
    expect(reply.draft.otherHardThings).toEqual(["the vacuum"]);
    expect(reply.nextQuestion).toBe("What does Sam look like?");
  });

  it("wraps up after the question limit even if the model keeps going", async () => {
    const askNext: AskNext = async () => ({ draft: EMPTY_PROFILE_DRAFT, nextQuestion: "One more?", done: false });
    const app = new Hono().route("/api/interview", interviewRoutes({ askNext }));
    const turns = Array.from({ length: 14 }, (_, i) => ({ question: `Q${i}`, answer: "skip" }));
    const reply = (await (await post(app, { turns })).json()) as { done: boolean; nextQuestion: string };
    expect(reply.done).toBe(true);
    expect(reply.nextQuestion).toContain("review everything");
  });
});
