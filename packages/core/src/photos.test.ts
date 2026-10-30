import { describe, expect, it } from "vitest";
import { samplePlayer, sampleEvent } from "./fixtures.js";
import { MAX_MOST_HELPFUL, photoChecklist } from "./photos.js";
import type { Event } from "./event.js";

describe("photoChecklist", () => {
  it("suggests the entrance, the people, the comfort items and the inside first", () => {
    const { items } = photoChecklist(sampleEvent, samplePlayer);
    const top = items.filter((i) => i.priority === "most-helpful").map((i) => i.label);
    expect(top).toEqual([
      "The outside or front door of Dr. Patel's office",
      "Dr. Patel (doctor)",
      "Nurse Kim (nurse)",
      "Bear (your child's comfort item)",
      "headphones (your child's comfort item)",
    ]);
    // Never more than 5 "most helpful"; the inside shots become nice-to-haves.
    expect(items.find((i) => i.label === "Inside Dr. Patel's office")?.priority).toBe("nice-to-have");
  });

  it("drops a comfort item once its photo is added", () => {
    const player = {
      ...samplePlayer,
      comforts: samplePlayer.comforts.map((c) => (c.id === "bear" ? { ...c, photo: { id: "ph", src: "bear.jpg" } } : c)),
    };
    expect(photoChecklist(sampleEvent, player).items.some((i) => i.id === "comfort-bear")).toBe(false);
  });

  it("adds common extras for the kind of event as nice-to-haves", () => {
    const { items } = photoChecklist(sampleEvent, samplePlayer);
    const extra = items.find((i) => i.label === "The exam room");
    expect(extra?.priority).toBe("nice-to-have");
    expect(extra?.attachTo).toEqual({ kind: "place", id: "pl-office" });
  });

  it("uses the sensory notes to explain why the inside matters", () => {
    const inside = photoChecklist(sampleEvent, samplePlayer).items.find((i) => i.id === "place-pl-office-inside");
    expect(inside?.why).toContain("the waiting room can be noisy");
  });

  it("skips photos the user already added", () => {
    const withPhoto: Event = {
      ...sampleEvent,
      people: sampleEvent.people.map((p) => ({ ...p, photo: { id: "ph1", src: "x.png" } })),
    };
    expect(photoChecklist(withPhoto, samplePlayer).items.some((i) => i.id === "person-p-patel")).toBe(false);
  });

  it("never marks more than the cap as most helpful", () => {
    const busy: Event = {
      ...sampleEvent,
      people: Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: `Person ${i}`, facts: [] })),
    };
    const top = photoChecklist(busy, samplePlayer).items.filter((i) => i.priority === "most-helpful");
    expect(top).toHaveLength(MAX_MOST_HELPFUL);
  });

  it("matches haircut extras from the event kind", () => {
    const haircut: Event = { ...sampleEvent, kind: "haircut", title: "Haircut at Joe's" };
    const labels = photoChecklist(haircut, samplePlayer).items.map((i) => i.label);
    expect(labels).toContain("The cape");
    expect(labels).not.toContain("The exam room");
  });

  it("always says every photo is optional", () => {
    expect(photoChecklist(sampleEvent, samplePlayer).generalTips[0]).toContain("optional");
  });
});
