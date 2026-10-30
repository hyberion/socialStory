import { describe, expect, it } from "vitest";
import { Event } from "./event.js";
import { EVENT_TEMPLATES, eventFromTemplate } from "./templates.js";
import { sampleEvents } from "./fixtures.js";
import { photoChecklist } from "./photos.js";
import { samplePlayer } from "./fixtures.js";

const args = { id: "e1", playerId: "p1", startsAt: "2026-11-03T10:00:00-05:00" };

describe("event templates", () => {
  it("every template makes a valid event whose steps point at real people and places", () => {
    for (const [name, t] of Object.entries(EVENT_TEMPLATES)) {
      const all = eventFromTemplate(t, { ...args, include: t.steps.map((s) => s.id) });
      expect(() => Event.parse(all), name).not.toThrow();
      const people = new Set(all.people.map((p) => p.id));
      const places = new Set(all.places.map((p) => p.id));
      for (const s of all.steps) {
        for (const id of s.personIds) expect(people.has(id), `${name} ${s.id} person ${id}`).toBe(true);
        if (s.placeId) expect(places.has(s.placeId), `${name} ${s.id} place`).toBe(true);
      }
      expect(t.askTheUser.length, name).toBeGreaterThan(0);
    }
  });

  it("the doctor template walks through the real process", () => {
    const e = eventFromTemplate(EVENT_TEMPLATES.doctor!, args);
    expect(e.steps.map((s) => s.id)).toEqual(["t1", "t2", "t3", "t4", "t5", "t7", "t8", "t9", "t11"]);
  });

  it("leaves 'sometimes' steps out unless picked, and their hard parts with them", () => {
    const without = eventFromTemplate(EVENT_TEMPLATES.doctor!, args);
    expect(without.steps.some((s) => s.description.includes("shot"))).toBe(false);
    expect(without.hardParts.map((h) => h.description)).toEqual(["waiting"]);
    const withShot = eventFromTemplate(EVENT_TEMPLATES.doctor!, { ...args, include: ["t10"] });
    expect(withShot.steps.find((s) => s.id === "t10")?.fixed).toBe(true);
    expect(withShot.hardParts.map((h) => h.description)).toContain("the shot");
  });

  it("the sample haircut and new-baby events are valid and get a photo checklist", () => {
    for (const name of ["haircut", "new-baby"]) {
      const e = sampleEvents[name]!;
      expect(() => Event.parse(e), name).not.toThrow();
      expect(photoChecklist(e, samplePlayer).items.filter((i) => i.priority === "most-helpful").length, name).toBeGreaterThan(0);
    }
    expect(sampleEvents.haircut!.steps.some((s) => s.description.includes("Ms. Rosa"))).toBe(true);
  });
});
