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
  PhotoPlan,
  samplePlayer,
  type EventInterviewReply,
} from "@socialstory/core";
import { DATA_DIR, storiesDir } from "./paths.js";
import { listEvents, loadEvent, newEventId, saveEvent } from "./events.js";
import { loadPlayer, savePlayer } from "./players.js";
import { addPhoto, removePhoto } from "./media.js";
import type { Segmenter } from "./sam.js";
import { writeStory, type GenerateDraft } from "./storyWriter.js";

export type ListenEvent = (prompt: { instructions: string; input: string }) => Promise<EventInterviewReply>;
const NOTHING = /^\s*(i don'?t know|not sure|no idea|skip( this one)?|pass|none|no|nope|n\/a)[.!]?\s*$/i;

/**
 * The event interview, building the outline, saving events, and writing a
 * story from a saved event. Model calls are passed in so tests run without
 * a Meta key.
 */
export function eventRoutes(options: { listen: ListenEvent; writer: () => GenerateDraft; segment: Segmenter; dataDir?: string }) {
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

  /** Adds a photo for one to-do item (raw image bytes in the body). */
  routes.post("/:id/photos/:itemId", async (c) => {
    const e = loadEvent(c.req.param("id"), dataDir);
    if (!e) return c.json({ error: "No event with that id" }, 404);
    const upload = Buffer.from(await c.req.arrayBuffer());
    if (!upload.length) return c.json({ error: "No photo was sent." }, 400);
    if (upload.length > 15 * 1024 * 1024) return c.json({ error: "That photo is over 15 MB. Try a smaller one." }, 400);
    try {
      const result = await addPhoto({ event: e, player: player(e.playerId), itemId: c.req.param("itemId"), upload, segment: options.segment }, dataDir);
      saveEvent(result.event, dataDir);
      if (result.player !== player(e.playerId)) savePlayer(result.player, dataDir);
      return c.json({ event: result.event, photo: result.photo, cutout: result.cutout });
    } catch (err) {
      return c.json({ error: (err as Error).message.includes("Input buffer") ? "That file isn't a photo the app can read. Try a JPG or PNG." : (err as Error).message }, 400);
    }
  });

  routes.delete("/:id/photos/:itemId", (c) => {
    const e = loadEvent(c.req.param("id"), dataDir);
    if (!e) return c.json({ error: "No event with that id" }, 404);
    const result = removePhoto({ event: e, player: player(e.playerId), itemId: c.req.param("itemId") }, dataDir);
    saveEvent(result.event, dataDir);
    savePlayer(result.player, dataDir);
    return c.json({ event: result.event });
  });

  /** "Can't get it" choice for one to-do item; null clears it. */
  routes.put("/:id/plans/:itemId", async (c) => {
    const e = loadEvent(c.req.param("id"), dataDir);
    if (!e) return c.json({ error: "No event with that id" }, 404);
    const { plan } = (await c.req.json().catch(() => ({}))) as { plan?: unknown };
    const parsed = PhotoPlan.nullable().safeParse(plan ?? null);
    if (!parsed.success) return c.json({ error: "Unknown choice" }, 400);
    const plans = { ...e.photoPlans };
    if (parsed.data) plans[c.req.param("itemId")] = parsed.data;
    else delete plans[c.req.param("itemId")];
    return c.json({ event: saveEvent({ ...e, photoPlans: plans }, dataDir) });
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
