import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { EMPTY_EVENT_DRAFT, sampleStory, type Event } from "@socialstory/core";
import { eventRoutes, type ListenEvent } from "./eventRoutes.js";
import { draftRoutes } from "./draftRoutes.js";

const json = (body: unknown) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const fakeWriter = () => async () => ({
  data: { title: sampleStory.title, answers: sampleStory.answers, pages: sampleStory.pages.map((p) => ({ section: p.section, stepId: p.stepId ?? "", sceneBrief: p.sceneBrief ?? "", inPicture: p.inPicture, sentences: p.sentences })) },
  usage: { inputTokens: 0, outputTokens: 0, reasoningTokens: 0 },
});

function setup(listen: ListenEvent = async () => { throw new Error("no model in tests"); }) {
  const dataDir = mkdtempSync(join(tmpdir(), "events-"));
  const app = new Hono()
    .route("/api/events", eventRoutes({ listen, writer: fakeWriter, dataDir }))
    .route("/api/drafts", draftRoutes({ rewrite: async () => { throw new Error(); }, writer: fakeWriter, dataDir }));
  return { app, dataDir };
}

describe("event interview route", () => {
  it("starts free, shows the child's name, and records answers", async () => {
    let seen = "";
    const { app } = setup(async (prompt) => {
      seen = prompt.input;
      return { draft: { ...EMPTY_EVENT_DRAFT, date: "2026-11-03", time: "10:00" } };
    });
    const first = (await (await app.request("/api/events/interview", json({ templateKey: "doctor", playerId: "player-sam" }))).json()) as { next: { id: string } };
    expect(first.next.id).toBe("event-when");
    const second = (await (
      await app.request(
        "/api/events/interview",
        json({ templateKey: "doctor", playerId: "player-sam", today: "Sunday, 2026-11-01", answer: { questionId: "event-when", text: "Tuesday at 10" } }),
      )
    ).json()) as { next: { id: string; screen: string }; draft: { date: string } };
    expect(seen).toContain("Today is Sunday, 2026-11-01.");
    expect(second.draft.date).toBe("2026-11-03");
    expect(second.next.id).toBe("event-who-with");
    expect(second.next.screen).toBe("Who's going with Sam?");
  });
});

describe("events", () => {
  it("builds an outline, saves it, lists its photos, writes its story, and opens in the editor", async () => {
    const { app, dataDir } = setup();
    const outline = (await (
      await app.request("/api/events/build", json({ templateKey: "haircut", playerId: "player-sam", tzOffset: "-05:00", draft: { ...EMPTY_EVENT_DRAFT, date: "2026-11-07", time: "11:30", title: "Haircut with Ms. Rosa" } }))
    ).json()) as Event;
    expect(outline.startsAt).toBe("2026-11-07T11:30:00-05:00");

    const saved = (await (await app.request("/api/events", json(outline))).json()) as Event;
    expect(saved.id).toMatch(/^haircut-with-ms-rosa-[0-9a-f]{4}$/);
    const photos = (await (await app.request(`/api/events/${saved.id}/photos`)).json()) as { items: unknown[] };
    expect(photos.items.length).toBeGreaterThan(0);

    const wrote = await app.request(`/api/events/${saved.id}/write`, { method: "POST" });
    expect(wrote.status).toBe(200);
    expect(existsSync(join(dataDir, "stories", `${saved.id}.json`))).toBe(true);

    // The editor finds the user's own event, not just the samples.
    expect(await (await app.request("/api/drafts")).json()).toContain(saved.id);
    const draft = (await (await app.request(`/api/drafts/${saved.id}`)).json()) as { event: { title: string } };
    expect(draft.event.title).toBe("Haircut with Ms. Rosa");
  });
});
