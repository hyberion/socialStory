import { z } from "zod";
import { Communication, HardThing, PlayerProfile, ReadingLevel, WayIn } from "./profile.js";
import { HARD_THING_LABELS } from "./onboarding.js";

/**
 * Interviews: Spark asks one question at a time, updates a draft from each
 * answer, and says when it has enough. The user reviews the result as a
 * form before anything is saved. First used for the child profile.
 */

export interface InterviewTurn {
  question: string;
  answer: string;
}

/** The profile in the strict shape the model fills ("unknown", 0 and [] mean not answered yet). */
export const ProfileInterviewDraft = z.object({
  displayName: z.string(),
  appearance: z.string(),
  /** 0 = not given. */
  age: z.number(),
  readingLevel: z.enum([...ReadingLevel.options, "unknown"]),
  communication: z.enum([...Communication.options, "unknown"]),
  hardThings: z.array(HardThing),
  otherHardThings: z.array(z.string()),
  helps: z.array(z.string()),
  comforts: z.array(z.object({ name: z.string(), appearance: z.string() })),
  interests: z.array(z.string()),
  canTap: z.enum(["yes", "no", "unknown"]),
  canDrag: z.enum(["yes", "no", "unknown"]),
  canType: z.enum(["yes", "no", "unknown"]),
  waysIn: z.array(WayIn),
});
export type ProfileInterviewDraft = z.infer<typeof ProfileInterviewDraft>;

export const ProfileInterviewReply = z.object({
  draft: ProfileInterviewDraft,
  /** The next question, or a short closing line when done. */
  nextQuestion: z.string(),
  done: z.boolean(),
});
export type ProfileInterviewReply = z.infer<typeof ProfileInterviewReply>;

export const EMPTY_PROFILE_DRAFT: ProfileInterviewDraft = {
  displayName: "",
  appearance: "",
  age: 0,
  readingLevel: "unknown",
  communication: "unknown",
  hardThings: [],
  otherHardThings: [],
  helps: [],
  comforts: [],
  interests: [],
  canTap: "unknown",
  canDrag: "unknown",
  canType: "unknown",
  waysIn: [],
};

/** Asked without a model call, so starting an interview is free and instant. */
export const PROFILE_OPENING_QUESTION = "Let's set up your child's profile. What's their name, or the nickname you use?";

/** Most questions before the interview wraps up, whatever the model says. */
export const PROFILE_INTERVIEW_MAX_TURNS = 14;

const PROFILE_INTERVIEW_RULES = `You are helping a parent, caregiver or teacher set up a profile for an autistic child in an app that prepares children for new events with calm, honest picture stories.

How to interview
- Ask exactly one short, warm, plain question at a time. No lists of questions, no jargon.
- Cover these topics, in roughly this order, skipping any already answered: the child's name or nickname; what they look like (for the pictures); age (optional); how well they read; how they usually communicate; what is hard for them (sounds, lights, touch, waiting, new people, crowds, smells, changes in plans, being away from family, or anything else); what helps them, including comfort items and what those look like; things they love; what they can comfortably do on a screen (tap, drag, type); whether they take in stories best by reading, listening or playing.
- "I don't know", "not sure" or "skip" are always fine. Leave that field as it is and move on. Never ask the same thing twice.
- After about 10 questions, or when the topics are covered, set done to true and make nextQuestion a short closing line saying they can review everything next.

What to record
- Record only what the user actually said, in the draft fields. Never guess or fill in typical values. Keep everything already in the draft unless the user corrects it.
- Map what they describe onto the fixed lists where it fits (e.g. "covers his ears when the blender goes" is sudden-noises); put anything else in otherHardThings or helps in their own words, briefly.
- Never record a diagnosis or medical condition (autism, ADHD, anxiety disorder and so on), even if the user mentions one. Record only what they describe the child doing, needing or finding hard. Do not ask about diagnoses, medications or therapies.
- readingLevel: pre-verbal (not reading yet), early-reader (short simple sentences), reader (reads well), fluent-reader (strong reader, older child or teen). Use "unknown" if not clear.
- age: 0 unless the user gives one.`;

export function buildProfileInterviewPrompt(draft: ProfileInterviewDraft, turns: InterviewTurn[]) {
  return {
    instructions: PROFILE_INTERVIEW_RULES,
    input: [
      "The profile so far (JSON):",
      JSON.stringify(draft, null, 2),
      "",
      "The conversation so far:",
      ...turns.map((t) => `Q: ${t.question}\nA: ${t.answer}`),
      "",
      "Update the draft from the latest answer, then ask the next question (or finish).",
    ].join("\n"),
  };
}

/**
 * Safety net under the prompt rule: diagnosis words never reach a saved
 * profile, even if the model slips. Drops any free-text line that names one.
 */
const DIAGNOSIS = /\b(autis\w*|asd|adhd|aspergers?|asperger's|pda|ocd|spd|anxiety disorder|disorder|diagnos\w*|syndrome|spectrum|medication|meds)\b/i;
export const stripDiagnoses = (items: string[]) => items.filter((s) => !DIAGNOSIS.test(s));

export function cleanProfileDraft(draft: ProfileInterviewDraft): ProfileInterviewDraft {
  return {
    ...draft,
    otherHardThings: stripDiagnoses(draft.otherHardThings),
    helps: stripDiagnoses(draft.helps),
    appearance: DIAGNOSIS.test(draft.appearance) ? "" : draft.appearance,
  };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";

/** Turns a finished interview draft into profile fields for the review form. Unknowns keep the defaults. */
export function profileFromDraft(draft: ProfileInterviewDraft): Omit<PlayerProfile, "id"> {
  const d = cleanProfileDraft(draft);
  const yes = (v: string, fallback: boolean) => (v === "unknown" ? fallback : v === "yes");
  return PlayerProfile.omit({ id: true }).parse({
    displayName: d.displayName.trim() || "",
    appearance: d.appearance.trim() || undefined,
    age: d.age > 0 ? Math.round(d.age) : undefined,
    readingLevel: d.readingLevel === "unknown" ? undefined : d.readingLevel,
    communication: d.communication === "unknown" ? undefined : d.communication,
    hardThings: [...new Set(d.hardThings)],
    otherHardThings: d.otherHardThings,
    helps: d.helps,
    comforts: d.comforts.filter((c) => c.name.trim()).map((c) => ({ id: slug(c.name), name: c.name.trim(), appearance: c.appearance.trim() || undefined })),
    interests: d.interests,
    screen: { tap: yes(d.canTap, true), drag: yes(d.canDrag, false), type: yes(d.canType, false) },
    waysIn: d.waysIn.length ? [...new Set(d.waysIn)] : undefined,
  });
}

/** A short "what we have so far" list for the interview screen. */
export function summarizeProfileDraft(d: ProfileInterviewDraft): string[] {
  const out: string[] = [];
  if (d.displayName) out.push(`Name: ${d.displayName}`);
  if (d.age > 0) out.push(`Age: ${d.age}`);
  if (d.appearance) out.push(`Looks like: ${d.appearance}`);
  if (d.readingLevel !== "unknown") out.push(`Reading: ${d.readingLevel.replace("-", " ")}`);
  if (d.communication !== "unknown") out.push(`Communicates: ${d.communication.replace("-", " ")}`);
  const hard = [...d.hardThings.map((h) => HARD_THING_LABELS[h].toLowerCase()), ...stripDiagnoses(d.otherHardThings)];
  if (hard.length) out.push(`Hard: ${hard.join(", ")}`);
  const helps = [...stripDiagnoses(d.helps), ...d.comforts.map((c) => c.name)];
  if (helps.length) out.push(`Helps: ${helps.join(", ")}`);
  if (d.interests.length) out.push(`Loves: ${d.interests.join(", ")}`);
  const screen = (["canTap", "canDrag", "canType"] as const).filter((k) => d[k] === "yes").map((k) => k.slice(3).toLowerCase());
  if (screen.length) out.push(`Can: ${screen.join(", ")}`);
  return out;
}
