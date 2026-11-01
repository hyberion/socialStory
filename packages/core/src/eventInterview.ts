import { z } from "zod";
import { Event, type Person, type Step } from "./event.js";
import { EVENT_TEMPLATES, eventFromTemplate, type EventTemplate } from "./templates.js";

/**
 * The event interview: same design as the profile interview. A fixed bank
 * of questions (general ones plus the template's own), pre-recorded audio
 * that says "your child", Spark only fills in a draft, code picks the next
 * question and builds the Event from the template plus the answers.
 */

const TRANSPORT_MODES = ["car", "bus", "train", "walk", "other"] as const;

export const EventInterviewDraft = z.object({
  title: z.string(),
  /** YYYY-MM-DD, or "" if not given. */
  date: z.string(),
  /** HH:MM, 24-hour, or "" if not given. */
  time: z.string(),
  purpose: z.string(),
  /** Who goes with the child: what the child calls them. */
  companions: z.array(z.object({ name: z.string(), role: z.string(), appearance: z.string() })),
  /** People the child will meet. `role` matches the template's roles where it can ("doctor"). */
  people: z.array(z.object({ role: z.string(), name: z.string(), appearance: z.string(), facts: z.array(z.string()) })),
  /** The place's real name ("Dr. Patel's office"), or "". */
  placeName: z.string(),
  sensoryNotes: z.array(z.string()),
  /** Template "sometimes" steps the user said will happen. */
  includeSteps: z.array(z.string()),
  /** Template steps the user said won't happen. */
  skipSteps: z.array(z.string()),
  /** Steps the template doesn't have, placed after a template step id ("" = near the end). */
  extraSteps: z.array(z.object({ description: z.string(), afterStepId: z.string() })),
  hardParts: z.array(z.string()),
  transportMode: z.enum([...TRANSPORT_MODES, ""]),
  transportName: z.string(),
  transportAppearance: z.string(),
  /** Comfort items just for this event. */
  comforts: z.array(z.object({ name: z.string(), appearance: z.string() })),
  /** Anything else, as plain facts the user gave. */
  notes: z.string(),
});
export type EventInterviewDraft = z.infer<typeof EventInterviewDraft>;

export const EventInterviewReply = z.object({ draft: EventInterviewDraft });
export type EventInterviewReply = z.infer<typeof EventInterviewReply>;

export const EMPTY_EVENT_DRAFT: EventInterviewDraft = {
  title: "",
  date: "",
  time: "",
  purpose: "",
  companions: [],
  people: [],
  placeName: "",
  sensoryNotes: [],
  includeSteps: [],
  skipSteps: [],
  extraSteps: [],
  hardParts: [],
  transportMode: "",
  transportName: "",
  transportAppearance: "",
  comforts: [],
  notes: "",
};

/** "Something else": no template, so the interview asks what happens. */
export const OTHER_TEMPLATE_KEY = "other";

export interface EventQuestion {
  id: string;
  spoken: string;
  /** "{name}" becomes the child's name. */
  screen: string;
  answered: (d: EventInterviewDraft) => boolean;
  /** Show the template's usual steps on this card. */
  showSteps?: boolean;
}

const q = (id: string, spoken: string, answered: (d: EventInterviewDraft) => boolean = () => false, extra: Partial<EventQuestion> = {}): EventQuestion => ({
  id,
  spoken,
  screen: spoken.replaceAll("your child", "{name}").replace(/^\{name\}/, "{Name}"),
  answered,
  ...extra,
});

const GENERAL_FIRST: EventQuestion[] = [
  q("event-when", "When is it? Tell me the day and the time.", (d) => !!d.date && !!d.time),
  q("event-who-with", "Who's going with your child?", (d) => d.companions.length > 0),
  q("event-why", "Why is it happening? Say it the way you'd explain it to your child.", (d) => !!d.purpose.trim()),
];
const OTHER_QUESTIONS: EventQuestion[] = [
  q("event-what", "What's coming up? Tell me what will happen, step by step.", (d) => d.extraSteps.length > 0),
  q("event-who-meet", "Who will your child meet there? Tell me their names, and what they look like.", (d) => d.people.length > 0),
];
const GENERAL_LAST: EventQuestion[] = [
  q("event-getting-there", "How will you get there? If you're driving, what does the car look like?", (d) => d.transportMode !== ""),
  q("event-place", "What's the place like? Is it noisy, bright, or crowded? Does it smell like anything?"),
  q("event-steps", "Here are the usual steps. Is anything different, or is there anything extra that will happen?", () => false, { showSteps: true }),
  q("event-hard", "What do you think will be the hardest part for your child?", (d) => d.hardParts.length > 0),
  q("event-anything-else", "Is there anything else about the day that would help us?", (d) => !!d.notes.trim()),
];

/** The questions for one template, in order. */
export function eventQuestions(templateKey: string): EventQuestion[] {
  const template = EVENT_TEMPLATES[templateKey];
  const own = template ? template.askTheUser.map((text, i) => q(`${templateKey}-${i + 1}`, text)) : OTHER_QUESTIONS;
  const last = template ? GENERAL_LAST : GENERAL_LAST.filter((x) => x.id !== "event-steps");
  return [...GENERAL_FIRST, ...own, ...last];
}

/** Every event question across all templates, for recording audio. */
export function allEventQuestions(): EventQuestion[] {
  const seen = new Map<string, EventQuestion>();
  for (const key of [...Object.keys(EVENT_TEMPLATES), OTHER_TEMPLATE_KEY]) for (const x of eventQuestions(key)) seen.set(x.id, x);
  return [...seen.values()];
}

export function nextEventQuestion(templateKey: string, draft: EventInterviewDraft, askedIds: string[]): EventQuestion | undefined {
  const asked = new Set(askedIds);
  return eventQuestions(templateKey).find((x) => !asked.has(x.id) && !x.answered(draft));
}

export function eventScreenText(x: EventQuestion, childName: string): string {
  const name = childName.trim();
  if (!name) return x.spoken;
  return x.screen.replaceAll("{Name}", name).replaceAll("{name}", name);
}

const EVENT_LISTENER_RULES = `You help a parent, caregiver or teacher describe an upcoming event for an autistic child, in an app that prepares children with calm, honest picture stories. The app asks fixed questions; your job is only to record the answers in the draft.

You get the draft so far, the template's usual steps and people, today's date, the question just asked, and the answer. Return the updated draft.

- Fill in every field the answer covers, not only the one the question was about.
- Record only what the user actually said. Never guess or add typical details. Keep everything already in the draft unless the answer corrects it.
- "I don't know", "not sure", "skip" or "no": change nothing.
- date: YYYY-MM-DD. Work out "Tuesday" or "next Friday" from today's date (the next one coming). time: HH:MM in 24-hour time. Leave "" if not given.
- companions: who goes with the child, named the way the child says it ("Dad", "Grandma"), with role and looks if given.
- people: who the child will meet. Use the template's role words where they fit ("doctor", "nurse") so they replace the template's placeholder people. Put true, friendly details they give in facts ("has a fish tank").
- includeSteps: ids of the template's "sometimes" steps the user says will happen (a shot, clippers). skipSteps: ids of template steps the user says won't happen.
- extraSteps: things that will happen that aren't in the template, each placed after the template step it follows (afterStepId; "" if unsure). Short, plain, first person plural or about the child ("We park in the garage.").
- hardParts: what the user expects to be hard, in a few words each.
- transportMode: car, bus, train, walk or other; transportName is what the family calls it ("the blue car"); transportAppearance how it looks.
- comforts: comfort items the user mentions for this day.
- notes: other plain facts about the day that don't fit elsewhere.
- Never record a diagnosis or medical condition.`;

function templateContext(templateKey: string): string {
  const t = EVENT_TEMPLATES[templateKey];
  if (!t) return "Template: none (the user describes the event from scratch).";
  return [
    `Template: ${t.label}`,
    "Usual steps (id: text):",
    ...t.steps.map((s) => `- ${s.id}: ${s.description}${s.how === "sometimes" ? " (sometimes)" : ""}`),
    `Template people (role: placeholder name): ${t.people.map((p) => `${p.role}: ${p.name}`).join("; ")}`,
  ].join("\n");
}

export function buildEventListenerPrompt(args: {
  templateKey: string;
  draft: EventInterviewDraft;
  questionId: string;
  answer: string;
  today: string;
  childName: string;
}) {
  const question = eventQuestions(args.templateKey).find((x) => x.id === args.questionId);
  return {
    instructions: EVENT_LISTENER_RULES,
    input: [
      `Today is ${args.today}.`,
      templateContext(args.templateKey),
      "",
      "The draft so far (JSON):",
      JSON.stringify(args.draft, null, 2),
      "",
      `Question: ${question ? eventScreenText(question, args.childName) : args.questionId}`,
      `Answer: ${args.answer}`,
    ].join("\n"),
  };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Builds the Event: the template's steps (plus picked "sometimes" steps,
 * minus skipped ones, plus extras), people named and described, the
 * placeholder names in step text replaced with real names.
 */
export function eventFromDraft(
  templateKey: string,
  draft: EventInterviewDraft,
  args: { id: string; playerId: string; tzOffset: string },
): Event {
  const template: EventTemplate | undefined = EVENT_TEMPLATES[templateKey];
  const base = template
    ? eventFromTemplate(template, { id: args.id, playerId: args.playerId, startsAt: "", include: draft.includeSteps })
    : undefined;

  // People: fill the template's placeholders by role; add anyone else.
  const used = new Set<number>();
  const people: Person[] = (base?.people ?? []).map((p) => {
    const i = draft.people.findIndex((d, n) => !used.has(n) && d.role.trim().toLowerCase() === (p.role ?? "").toLowerCase());
    if (i < 0) return p;
    used.add(i);
    const d = draft.people[i]!;
    return { ...p, name: d.name.trim() || p.name, appearance: d.appearance.trim() || undefined, facts: d.facts.slice(0, 3) };
  });
  draft.people.forEach((d, i) => {
    if (used.has(i) || !d.name.trim()) return;
    people.push({ id: `p-${slug(d.name)}`, name: d.name.trim(), role: d.role.trim() || undefined, appearance: d.appearance.trim() || undefined, facts: d.facts.slice(0, 3) });
  });

  // Steps: drop skipped, insert extras, then put real names into the text.
  let steps: Step[] = (base?.steps ?? []).filter((s) => !draft.skipSteps.includes(s.id));
  // Extras keep the order they were said in: each goes after its anchor step,
  // or after the last extra placed at that same anchor. No anchor = just
  // before the template's final step ("go home"), or at the end if there's
  // no template.
  const finalId = template && steps.length ? steps[steps.length - 1]!.id : undefined;
  const lastPlaced = new Map<string, string>();
  draft.extraSteps.forEach((x, n) => {
    if (!x.description.trim()) return;
    const step: Step = { id: `x${n + 1}`, description: x.description.trim(), personIds: [], fixed: false };
    const anchor = steps.some((s) => s.id === x.afterStepId) ? x.afterStepId : "";
    const after = lastPlaced.get(anchor) ?? anchor;
    let at = after ? steps.findIndex((s) => s.id === after) + 1 : finalId ? steps.findIndex((s) => s.id === finalId) : steps.length;
    if (!after && lastPlaced.size === 0 && finalId === undefined) at = steps.length;
    steps.splice(at, 0, step);
    lastPlaced.set(anchor, step.id);
  });
  for (const p of base?.people ?? []) {
    const now = people.find((x) => x.id === p.id);
    if (!now || now.name === p.name) continue;
    const re = new RegExp(escapeRe(p.name), "gi");
    steps = steps.map((s) => ({ ...s, description: s.description.replace(re, now.name) }));
  }

  const places = (base?.places ?? []).map((p, i) =>
    i === 0 ? { ...p, name: draft.placeName.trim() || p.name, sensoryNotes: [...p.sensoryNotes, ...draft.sensoryNotes] } : p,
  );
  if (!places.length && (draft.placeName.trim() || draft.sensoryNotes.length)) {
    places.push({ id: "pl-1", name: draft.placeName.trim() || "the place", photos: [], sensoryNotes: draft.sensoryNotes });
  }

  const hardParts = [
    ...(base?.hardParts ?? []),
    ...draft.hardParts.filter((h) => h.trim()).map((h, i) => ({ id: `hx${i + 1}`, description: h.trim() })),
  ];
  const transport =
    draft.transportMode && draft.transportMode !== "walk"
      ? { mode: draft.transportMode, name: draft.transportName.trim() || `the ${draft.transportMode}`, appearance: draft.transportAppearance.trim() || undefined }
      : draft.transportMode === "walk"
        ? { mode: "walk" as const, name: "walking" }
        : undefined;

  return Event.parse({
    id: args.id,
    playerId: args.playerId,
    title: draft.title.trim() || base?.title || "Something coming up",
    kind: base?.kind ?? "other",
    startsAt: draft.date && draft.time ? `${draft.date}T${draft.time}:00${args.tzOffset}` : draft.date ? `${draft.date}T09:00:00${args.tzOffset}` : "",
    purpose: draft.purpose.trim() || base?.purpose,
    companions: draft.companions
      .filter((c) => c.name.trim())
      .map((c) => ({ id: `c-${slug(c.name)}`, name: c.name.trim(), role: c.role.trim() || undefined, appearance: c.appearance.trim() || undefined, facts: [] })),
    people,
    places,
    transport,
    steps: steps.length ? steps : [{ id: "x0", description: "We get ready.", personIds: [], fixed: false }],
    hardParts,
    comforts: draft.comforts.filter((c) => c.name.trim()).map((c) => ({ id: slug(c.name), name: c.name.trim(), appearance: c.appearance.trim() || undefined })),
    notes: draft.notes.trim() || undefined,
  });
}

/** "So far" panel lines. */
export function summarizeEventDraft(d: EventInterviewDraft): string[] {
  const out: string[] = [];
  if (d.date || d.time) out.push(`When: ${[d.date, d.time].filter(Boolean).join(" at ")}`);
  if (d.companions.length) out.push(`Going: ${d.companions.map((c) => c.name).join(", ")}`);
  if (d.purpose) out.push(`Why: ${d.purpose}`);
  if (d.people.length) out.push(`Meeting: ${d.people.map((p) => p.name || p.role).join(", ")}`);
  if (d.placeName) out.push(`Where: ${d.placeName}`);
  if (d.transportMode) out.push(`Getting there: ${d.transportName || d.transportMode}`);
  if (d.includeSteps.length || d.extraSteps.length) out.push(`Extra steps: ${d.includeSteps.length + d.extraSteps.length}`);
  if (d.hardParts.length) out.push(`Hard: ${d.hardParts.join(", ")}`);
  if (d.notes) out.push(`Also: ${d.notes}`);
  return out;
}
