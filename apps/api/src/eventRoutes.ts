import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Hono } from "hono";
import {
  EMPTY_EVENT_DRAFT,
  EventInterviewDraft,
  buildEventListenerPrompt,
  eventFromDraft,
  eventQuestions,
  eventScreenText,
  nextEventQuestion,
  photoChecklist,
  samplePlayer,
  type EventInterviewReply,
} from "@socialstory/core";
import { DATA_DIR, storiesDir } from "./paths.js";
import { listEvents, loadEvent, newEventId, saveEvent } from "./events.js";
import { loadPlayer } from "./players.js";
import { writeStory, type GenerateDraft } from "./storyWriter.js";

export type ListenEvent = (prompt: { instructions: string; input: string }) => Promise<EventInterviewReply>;
const NOTHING = /^\s*(i don'?t know|not sure|no idea|skip( this one)?|pass|none|no|nope|n\/a)[.!]?\s*$/i;

/**
 * The event interview, building the outline, saving events, and writing a
 * story from a saved event. Model calls are passed in so tests run without
 * a Meta key.
 */
export function eventRoutes(options: { listen: ListenEvent; writer: () => GenerateDraft; dataDir?: string }) {
  const dataDir = options.dataDir ?? DATA_DIR;
  const routes = new Hono();
  const player = (id: unknown) => (typeof id === "string" && loadPlayer(id, dataDir)) || samplePlayer;

  /** One interview step: record the answer (if any), pick the next question. */
  routes.post("/interview", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      templateKey?: string;
      playerId?: string;
      today?: string;
      draft?: unknown;
      asked?: unknown;
      answer?: { questionId?: unknown; text?: unknown };
    };
    const templateKey = typeof body.templateKey === "string" ? body.templateKey : "other";
    const child = player(body.playerId);
    const bank = eventQuestions(templateKey);
    const parsed = EventInterviewDraft.safeParse(body.draft);
    let draft = parsed.success ? parsed.data : EMPTY_EVENT_DRAFT;
    const asked = Array.isArray(body.asked) ? body.asked.filter((x): x is string => typeof x === "string" && bank.some((q) => q.id === x)) : [];

    const questionId = typeof body.answer?.questionId === "string" ? body.answer.questionId : undefined;
    const text = typeof body.answer?.text === "string" ? body.answer.text.slice(0, 3000).trim() : "";
    if (questionId && bank.some((q) => q.id === questionId)) {
      if (text && !NOTHING.test(text)) {
        const prompt = buildEventListenerPrompt({
          templateKey,
          draft,
          questionId,
          answer: text,
          today: typeof body.today === "string" ? body.today.slice(0, 40) : new Date().toDateString(),
          childName: child.displayName,
        });
        draft = (await options.listen(prompt)).draft;
      }
      if (!asked.includes(questionId)) asked.push(questionId);
    }

    const next = nextEventQuestion(templateKey, draft, asked);
    const remaining = bank.filter((q) => !asked.includes(q.id) && !q.answered(draft)).length;
    return c.json({
      draft,
      asked,
      next: next ? { id: next.id, spoken: next.spoken, screen: eventScreenText(next, child.displayName), showSteps: !!next.showSteps } : null,
      progress: { number: asked.length + 1, total: asked.length + remaining },
    });
  });

  /** Turns finished answers into an event outline to review (not saved yet). */
  routes.post("/build", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { templateKey?: string; playerId?: string; draft?: unknown; tzOffset?: string };
    const draft = EventInterviewDraft.parse(body.draft ?? EMPTY_EVENT_DRAFT);
    const offset = typeof body.tzOffset === "string" && /^[+-]\d{2}:\d{2}$/.test(body.tzOffset) ? body.tzOffset : "+00:00";
    const child = player(body.playerId);
    const event = eventFromDraft(body.templateKey ?? "other", draft, { id: "new", playerId: child.id, tzOffset: offset });
    return c.json(event);
  });

  routes.get("/", (c) => c.json(listEvents(dataDir)));
  routes.get("/:id", (c) => {
    const e = loadEvent(c.req.param("id"), dataDir);
    return e ? c.json(e) : c.json({ error: "No event with that id" }, 404);
  });

  /** Save an outline: a new event (id "new" or missing) gets an id. */
  routes.post("/", async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>;
    try {
      const id = typeof body.id === "string" && body.id !== "new" ? body.id : newEventId(String(body.title ?? "event"));
      return c.json(saveEvent({ ...body, id }, dataDir), 201);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  });
  routes.put("/:id", async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>;
    try {
      return c.json(saveEvent({ ...body, id: c.req.param("id") }, dataDir));
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  });

  /** The photo to-do list for a saved event. */
  routes.get("/:id/photos", (c) => {
    const e = loadEvent(c.req.param("id"), dataDir);
    return e ? c.json(photoChecklist(e, player(e.playerId))) : c.json({ error: "No event with that id" }, 404);
  });

  /** Writes the story for a saved event (about 10 seconds), ready for the editor. */
  routes.post("/:id/write", async (c) => {
    const e = loadEvent(c.req.param("id"), dataDir);
    if (!e) return c.json({ error: "No event with that id" }, 404);
    const result = await writeStory(e, player(e.playerId), options.writer());
    mkdirSync(storiesDir(dataDir), { recursive: true });
    writeFileSync(resolve(storiesDir(dataDir), `${e.id}.json`), JSON.stringify({ story: result.story, validation: result.validation }, null, 2));
    return c.json({ id: e.id, ok: result.validation.ok });
  });

  return routes;
}
