import { Hono } from "hono";
import {
  EMPTY_PROFILE_DRAFT,
  PROFILE_INTERVIEW_MAX_TURNS,
  PROFILE_OPENING_QUESTION,
  ProfileInterviewDraft,
  buildProfileInterviewPrompt,
  cleanProfileDraft,
  type InterviewTurn,
  type ProfileInterviewReply,
} from "@socialstory/core";

export type AskNext = (prompt: { instructions: string; input: string }) => Promise<ProfileInterviewReply>;

/**
 * Interview steps. The client keeps the conversation and draft and sends
 * them each time, so nothing is stored until the user saves the profile.
 */
export function interviewRoutes(options: { askNext: AskNext }) {
  const routes = new Hono();

  routes.post("/profile", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { draft?: unknown; turns?: InterviewTurn[] };
    const turns = (body.turns ?? []).filter((t) => typeof t?.question === "string" && typeof t?.answer === "string").slice(-30);
    const parsed = ProfileInterviewDraft.safeParse(body.draft);
    const draft = parsed.success ? parsed.data : EMPTY_PROFILE_DRAFT;

    // The first question is fixed: free and instant.
    if (turns.length === 0) return c.json({ draft, nextQuestion: PROFILE_OPENING_QUESTION, done: false });

    const reply = await options.askNext(buildProfileInterviewPrompt(draft, turns.map((t) => ({ question: t.question, answer: t.answer.slice(0, 2000) }))));
    const done = reply.done || turns.length >= PROFILE_INTERVIEW_MAX_TURNS;
    return c.json({
      draft: cleanProfileDraft(reply.draft),
      nextQuestion: done && !reply.done ? "Thanks, that's plenty to start with. Next you can review everything." : reply.nextQuestion,
      done,
    });
  });

  return routes;
}
