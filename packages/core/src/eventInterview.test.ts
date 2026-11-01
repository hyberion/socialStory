import { describe, expect, it } from "vitest";
import {
  EMPTY_EVENT_DRAFT,
  allEventQuestions,
  buildEventListenerPrompt,
  eventFromDraft,
  eventQuestions,
  eventScreenText,
  nextEventQuestion,
} from "./eventInterview.js";
import { buildStoryPrompt } from "./prompts.js";
import { samplePlayer } from "./fixtures.js";
import { photoChecklist } from "./photos.js";

const args = { id: "doctor-visit", playerId: "player-sam", tzOffset: "-05:00" };

const doctorAnswers = {
  ...EMPTY_EVENT_DRAFT,
  date: "2026-11-03",
  time: "10:00",
  purpose: "to get a flu shot that helps my body stay healthy",
  companions: [{ name: "Dad", role: "parent", appearance: "tall, beard, round glasses" }],
  people: [
    { role: "doctor", name: "Dr. Patel", appearance: "long black hair in a bun, white coat", facts: ["Dr. Patel has a fish tank."] },
    { role: "nurse", name: "Nurse Kim", appearance: "", facts: [] },
  ],
  placeName: "Dr. Patel's office",
  sensoryNotes: ["the waiting room is noisy"],
  includeSteps: ["t10"],
  skipSteps: ["t2"],
  extraSteps: [{ description: "We park in the big garage.", afterStepId: "t1" }],
  hardParts: ["the shot"],
  transportMode: "car" as const,
  transportName: "the blue car",
  transportAppearance: "a small light blue hatchback",
};

describe("event questions", () => {
  it("asks the general questions, then the template's own, then the rest", () => {
    const ids = eventQuestions("doctor").map((q) => q.id);
    expect(ids.slice(0, 3)).toEqual(["event-when", "event-who-with", "event-why"]);
    expect(ids).toContain("doctor-1");
    expect(ids.at(-1)).toBe("event-anything-else");
    expect(eventQuestions("other").map((q) => q.id)).toContain("event-what");
    expect(eventQuestions("other").map((q) => q.id)).not.toContain("event-steps");
  });

  it("skips questions an answer already covered", () => {
    const d = { ...EMPTY_EVENT_DRAFT, date: "2026-11-03", time: "10:00", companions: [{ name: "Dad", role: "", appearance: "" }] };
    expect(nextEventQuestion("doctor", d, [])?.id).toBe("event-why");
  });

  it("has unique ids, generic audio, and the name on screen", () => {
    const all = allEventQuestions();
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length);
    const who = all.find((q) => q.id === "event-who-with")!;
    expect(who.spoken).toBe("Who's going with your child?");
    expect(eventScreenText(who, "Sam")).toBe("Who's going with Sam?");
    const hard = all.find((q) => q.id === "event-hard")!;
    expect(eventScreenText(hard, "Sam")).toContain("hardest part for Sam");
  });

  it("gives the listener the template's steps and today's date", () => {
    const { input, instructions } = buildEventListenerPrompt({ templateKey: "doctor", draft: EMPTY_EVENT_DRAFT, questionId: "event-when", answer: "Tuesday at 10", today: "Sunday, 2026-11-01", childName: "Sam" });
    expect(input).toContain("Today is Sunday, 2026-11-01.");
    expect(input).toContain("t10: I get a shot in my arm. (sometimes)");
    expect(instructions).toContain("Record only what the user actually said");
  });
});

describe("eventFromDraft", () => {
  const e = eventFromDraft("doctor", doctorAnswers, args);

  it("names the people and puts their names into the steps", () => {
    expect(e.people.find((p) => p.role === "doctor")?.name).toBe("Dr. Patel");
    expect(e.steps.some((s) => s.description.includes("Dr. Patel comes in"))).toBe(true);
    expect(e.steps.some((s) => s.description.includes("Nurse Kim calls my name"))).toBe(true);
    expect(e.steps.some((s) => /the doctor|the nurse/i.test(s.description))).toBe(false);
  });

  it("adds picked 'sometimes' steps, drops skipped ones, and places extras", () => {
    const ids = e.steps.map((s) => s.id);
    expect(ids).toContain("t10");
    expect(e.steps.find((s) => s.id === "t10")?.fixed).toBe(true);
    expect(ids).not.toContain("t2");
    expect(ids.indexOf("x1")).toBe(ids.indexOf("t1") + 1);
  });

  it("keeps the event's own time, the car, the place and the hard parts", () => {
    expect(e.startsAt).toBe("2026-11-03T10:00:00-05:00");
    expect(e.transport).toEqual({ mode: "car", name: "the blue car", appearance: "a small light blue hatchback" });
    expect(e.places[0]?.name).toBe("Dr. Patel's office");
    expect(e.places[0]?.sensoryNotes).toContain("the waiting room is noisy");
    expect(e.hardParts.map((h) => h.description)).toContain("the shot");
    expect(buildStoryPrompt(e, samplePlayer).input).toContain("When: Tuesday, November 3, 10:00 in the morning");
    expect(photoChecklist(e, samplePlayer).items.length).toBeGreaterThan(0);
  });

  it("builds a 'something else' event from the user's own steps, with no date yet", () => {
    const other = eventFromDraft(
      "other",
      { ...EMPTY_EVENT_DRAFT, title: "Fire drill", extraSteps: [{ description: "The alarm rings.", afterStepId: "" }, { description: "We walk outside.", afterStepId: "" }] },
      args,
    );
    expect(other.steps.map((s) => s.description)).toEqual(["The alarm rings.", "We walk outside."]);
    expect(other.startsAt).toBe("");
    expect(buildStoryPrompt(other, samplePlayer).input).toContain("When: not decided yet");
  });
});

describe("extra steps keep their order", () => {
  it("several after the same step, and several with no anchor", () => {
    const e = eventFromDraft(
      "doctor",
      {
        ...EMPTY_EVENT_DRAFT,
        extraSteps: [
          { description: "We park.", afterStepId: "t1" },
          { description: "We take the elevator.", afterStepId: "t1" },
          { description: "We get a sticker.", afterStepId: "" },
          { description: "We wave goodbye.", afterStepId: "" },
        ],
      },
      args,
    );
    const d = e.steps.map((s) => s.description);
    expect(d.indexOf("We park.")).toBe(d.indexOf("We go to the doctor's office.") + 1);
    expect(d.indexOf("We take the elevator.")).toBe(d.indexOf("We park.") + 1);
    expect(d.slice(-3)).toEqual(["We get a sticker.", "We wave goodbye.", "We leave and go home."]);
  });
});

import { photoLetter } from "./photoLetter.js";

describe("photo letter", () => {
  it("is filled in from the event, asks only about places and people, and promises only what's true", () => {
    const e = eventFromDraft("doctor", doctorAnswers, args);
    const letter = photoLetter(e, "Sam", photoChecklist(e, samplePlayer));
    const text = JSON.stringify(letter);
    expect(letter.opening[0]).toContain("My child, Sam, is coming here on Tuesday, November 3 for a doctor visit.");
    expect(letter.asks.some((a) => a.startsWith("Dr. Patel, only if you're comfortable"))).toBe(true);
    expect(text).not.toMatch(/Bear|headphones/);       // the child's own things aren't asked about
    expect(text).not.toMatch(/delete|train/i);         // not promised until it's true
    expect(letter.closing[0]).toContain("fine to say no");
  });
});

describe("photo list duplicates", () => {
  it("doesn't list the exam room twice", () => {
    const e = eventFromDraft("doctor", doctorAnswers, args);
    const labels = photoChecklist(e, samplePlayer).items.map((i) => i.label);
    expect(labels.filter((l) => /exam room/i.test(l))).toEqual(["Inside the exam room"]);
    const letter = photoLetter(e, "Sam", photoChecklist(e, samplePlayer));
    expect(letter.asks.every((a) => a[0] === a[0]!.toUpperCase())).toBe(true);
  });
});

import { castFor } from "./cast.js";

describe("can't-get-it choices", () => {
  it("leave out removes someone from the pictures; generic drops their description", () => {
    const e = eventFromDraft("doctor", doctorAnswers, args);
    const patel = e.people.find((p) => p.name === "Dr. Patel")!;
    const nurse = e.people.find((p) => p.name === "Nurse Kim")!;
    const cast = castFor({ ...e, photoPlans: { [`person-${nurse.id}`]: "leave-out", [`person-${patel.id}`]: "generic" } }, samplePlayer);
    expect(cast.some((m) => m.id === nurse.id)).toBe(false);
    expect(cast.find((m) => m.id === patel.id)?.appearance).toBeUndefined();
    expect(cast.some((m) => m.id === "player")).toBe(true);
  });

  it("a place photo checks off only its own to-do", () => {
    const e = eventFromDraft("doctor", doctorAnswers, args);
    const office = e.places[0]!;
    const withPhoto = { ...e, places: e.places.map((p) => (p.id === office.id ? { ...p, photos: [{ id: `place-${office.id}-entrance`, src: "x.jpg" }] } : p)) };
    const ids = photoChecklist(withPhoto, samplePlayer).items.map((i) => i.id);
    expect(ids).not.toContain(`place-${office.id}-entrance`);
    expect(ids).toContain(`place-${office.id}-inside`);
  });
});

import { aboutMeEvent } from "./aboutMe.js";

describe("All about me", () => {
  it("is built only from the profile: me, what I love, what helps, how the app works", () => {
    const e = aboutMeEvent(samplePlayer);
    expect(e.id).toBe("sam-about-me");
    expect(e.title).toBe("All about Sam");
    expect(e.startsAt).toBe("");
    const text = e.steps.map((s) => s.description).join(" ");
    expect(text).toContain("This is me, Sam. What I look like: a seven-year-old boy");
    expect(text).toContain("I love trains.");
    expect(text).toContain("Bear and headphones are with me when I need them.");
    expect(text).toContain("I can tap the speaker to hear the words.");
    expect(text).not.toMatch(/waiting|noise/i); // no hard things
    expect(e.people).toEqual([]);
    const prompt = buildStoryPrompt(e, samplePlayer).input;
    expect(prompt).toContain("When: any time");
    expect(prompt).toContain("All about me");
  });

  it("works for a child with very little in the profile", () => {
    const e = aboutMeEvent({ ...samplePlayer, appearance: undefined, interests: [], comforts: [], helps: [], sensory: { ...samplePlayer.sensory, soundEnabled: false } });
    expect(e.steps.map((s) => s.id)).toEqual(["me", "app"]);
    expect(e.steps[0]!.description).toBe("This is me, Sam.");
  });
});
