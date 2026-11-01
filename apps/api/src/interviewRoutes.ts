import { Hono } from "hono";
import {
  EMPTY_PROFILE_DRAFT,
  PROFILE_QUESTIONS,
  ProfileInterviewDraft,
  buildProfileListenerPrompt,
  cleanProfileDraft,
  nextProfileQuestion,
  questionById,
  screenText,
  type ProfileInterviewReply,
} from "@socialstory/core";

export type Listen = (prompt: { instructions: string; input: string }) => Promise<ProfileInterviewReply>;

/** Answers that change nothing, so they don't need a model call. */
const NOTHING = /^\s*(i don'?t know|not sure|no idea|skip( this one)?|pass|none|no|n\/a)[.!]?\s*$/i;

/**
 * One interview step. The client keeps the conversation and draft and sends
 * them each time, so nothing is stored until the user saves the profile.
 * The questions come from a fixed bank; Spark only fills in the draft.
 */
export function interviewRoutes(options: { listen: Listen }) {
  const routes = new Hono();

  routes.post("/profile", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      draft?: unknown;
      asked?: unknown;
      answer?: { questionId?: unknown; text?: unknown };
    };
    const parsed = ProfileInterviewDraft.safeParse(body.draft);
    let draft = parsed.success ? parsed.data : EMPTY_PROFILE_DRAFT;
    const asked = Array.isArray(body.asked) ? body.asked.filter((x): x is string => typeof x === "string" && !!questionById(x)) : [];

    const questionId = typeof body.answer?.questionId === "string" ? body.answer.questionId : undefined;
    const text = typeof body.answer?.text === "string" ? body.answer.text.slice(0, 2000).trim() : "";
    if (questionId && questionById(questionId)) {
      if (text && !NOTHING.test(text)) {
        draft = cleanProfileDraft((await options.listen(buildProfileListenerPrompt(draft, questionId, text))).draft);
      }
      if (!asked.includes(questionId)) asked.push(questionId);
    }

    const next = nextProfileQuestion(draft, asked);
    const remaining = PROFILE_QUESTIONS.filter((q) => !asked.includes(q.id) && !q.answered(draft)).length;
    return c.json({
      draft,
      asked,
      next: next ? { id: next.id, spoken: next.spoken, screen: screenText(next, draft) } : null,
      progress: { number: asked.length + 1, total: asked.length + remaining },
    });
  });

  return routes;
}
