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

/** Stand-in SAM: "finds" a 10x10 square in the middle of the photo. */
const fakeSegment: import("./sam.js").Segmenter = async () => ({ bounds: { left: 5, top: 5, right: 15, bottom: 15 }, raster: new Uint8Array(100).fill(1), width: 10, height: 10 });

function setup(listen: ListenEvent = async () => { throw new Error("no model in tests"); }) {
  const dataDir = mkdtempSync(join(tmpdir(), "events-"));
  const app = new Hono()
    .route("/api/events", eventRoutes({ listen, writer: fakeWriter, segment: fakeSegment, dataDir }))
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

import sharp from "sharp";
import { loadPlayer } from "./players.js";

describe("All about me", () => {
  it("makes the child's first story from their profile, ready for the editor", async () => {
    const { app } = setup();
    const r = (await (await app.request("/api/events/about-me", json({ playerId: "player-sam" }))).json()) as { id: string };
    expect(r.id).toBe("sam-about-me");
    expect(await (await app.request("/api/drafts")).json()).toContain("sam-about-me");
    expect((await app.request("/api/events/about-me", json({ playerId: "player-nobody" }))).status).toBe(404);
  });
});

describe("media step", () => {
  async function savedDoctorEvent() {
    const ctx = setup();
    const outline = (await (await ctx.app.request("/api/events/build", json({ templateKey: "doctor", playerId: "player-sam", tzOffset: "-05:00", draft: { ...EMPTY_EVENT_DRAFT, people: [{ role: "doctor", name: "Dr. Patel", appearance: "", facts: [] }] } }))).json()) as Event;
    const saved = (await (await ctx.app.request("/api/events", json(outline))).json()) as Event;
    const photo = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#88aacc" } }).jpeg().toBuffer();
    const upload = (itemId: string) => ctx.app.request(`/api/events/${saved.id}/photos/${itemId}`, { method: "POST", body: photo, headers: { "Content-Type": "image/jpeg" } });
    return { ...ctx, saved, upload };
  }
  type Reply = { event: Event; photo?: { src: string; cutout?: string }; cutout?: string };

  it("a person's photo gets a SAM cutout and is attached to them", async () => {
    const { app, saved, upload, dataDir } = await savedDoctorEvent();
    const patel = saved.people.find((p) => p.name === "Dr. Patel")!;
    const r = (await (await upload(`person-${patel.id}`)).json()) as Reply;
    expect(r.cutout).toBe("made");
    expect(r.event.people.find((p) => p.id === patel.id)?.photo?.cutout).toMatch(/-cutout\.png$/);
    expect(existsSync(join(dataDir, "photos", r.photo!.cutout!))).toBe(true);
    // It drops off the to-do list, and the cutout can be fetched for a preview.
    const list = (await (await app.request(`/api/events/${saved.id}/photos`)).json()) as { items: Array<{ id: string }> };
    expect(list.items.some((i) => i.id === `person-${patel.id}`)).toBe(false);
  });

  it("a comfort item's photo is saved on the child's profile, for every story", async () => {
    const { upload, dataDir } = await savedDoctorEvent();
    const r = (await (await upload("comfort-bear")).json()) as Reply;
    expect(r.photo?.src).toBe("players/player-sam/comfort-bear.jpg");
    expect(loadPlayer("player-sam", dataDir)?.comforts.find((c) => c.id === "bear")?.photo?.cutout).toBeDefined();
  });

  it("a place photo checks off only its own to-do, and removing it brings the to-do back", async () => {
    const { app, saved, upload } = await savedDoctorEvent();
    const office = saved.places[0]!;
    const r = (await (await upload(`place-${office.id}-entrance`)).json()) as Reply;
    expect(r.cutout).toBe("not-needed");
    const ids = async () => ((await (await app.request(`/api/events/${saved.id}/photos`)).json()) as { items: Array<{ id: string }> }).items.map((i) => i.id);
    expect(await ids()).not.toContain(`place-${office.id}-entrance`);
    expect(await ids()).toContain(`place-${office.id}-inside`);
    await app.request(`/api/events/${saved.id}/photos/place-${office.id}-entrance`, { method: "DELETE" });
    expect(await ids()).toContain(`place-${office.id}-entrance`);
  });

  it("saves can't-get-it choices, and refuses photos that aren't on the list or aren't photos", async () => {
    const { app, saved, upload } = await savedDoctorEvent();
    const nurse = saved.people.find((p) => p.role === "nurse")!;
    const r = (await (await app.request(`/api/events/${saved.id}/plans/person-${nurse.id}`, { method: "PUT", body: JSON.stringify({ plan: "leave-out" }), headers: { "Content-Type": "application/json" } })).json()) as Reply;
    expect(r.event.photoPlans[`person-${nurse.id}`]).toBe("leave-out");
    expect((await upload("person-nobody")).status).toBe(400);
    const notPhoto = await app.request(`/api/events/${saved.id}/photos/comfort-bear`, { method: "POST", body: "hello", headers: { "Content-Type": "image/jpeg" } });
    expect(notPhoto.status).toBe(400);
  });
});
