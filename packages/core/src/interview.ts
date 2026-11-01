import { z } from "zod";
import { Communication, HardThing, PlayerProfile, ReadingLevel, WayIn } from "./profile.js";
import { HARD_THING_LABELS } from "./onboarding.js";

/**
 * Interviews run on a fixed question bank (Oct 31 decision):
 * - Every question maps to fields we actually store, so nothing is asked
 *   that goes nowhere, and the wording never drifts.
 * - Each question has pre-recorded audio (generic: "your child") while the
 *   screen shows the child's name, so nothing about the child is sent to
 *   the voice service.
 * - Spark only listens: it fills the profile from each answer (any field the
 *   answer covers, not just the one asked about). Code picks the next
 *   question: the first one whose fields are still empty and that hasn't
 *   been asked.
 * The user reviews everything as a form before it's saved.
 */

export interface InterviewTurn {
  /** Question id from the bank. */
  questionId: string;
  answer: string;
}

/** The profile in the strict shape the model fills ("unknown", 0, "" and [] mean not answered yet). */
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
  /** "Anything else": background in the parent's words. */
  notes: z.string(),
});
export type ProfileInterviewDraft = z.infer<typeof ProfileInterviewDraft>;

/** What Spark returns for each answer: just the updated draft. */
export const ProfileInterviewReply = z.object({ draft: ProfileInterviewDraft });
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
  notes: "",
};

export interface BankQuestion {
  id: string;
  /** Recorded once; generic so it fits every child ("your child"). */
  spoken: string;
  /** Shown on screen; "{name}" becomes the child's name once known. */
  screen: string;
  /** True when the draft already holds this answer, so the question is skipped. */
  answered: (d: ProfileInterviewDraft) => boolean;
}

/** The profile interview, in order. Audio files: /voice/questions/<id>.mp3. */
export const PROFILE_QUESTIONS: BankQuestion[] = [
  {
    id: "profile-name",
    spoken: "Let's set up your child's profile. What's your child's name, or the nickname you use?",
    screen: "Let's set up your child's profile. What's their name, or the nickname you use?",
    answered: (d) => !!d.displayName.trim(),
  },
  {
    id: "profile-looks",
    spoken: "What does your child look like? Things like hair, skin, and favorite clothes. This keeps them looking the same in every picture.",
    screen: "What does {name} look like? Things like hair, skin and favorite clothes. This keeps {name} looking the same in every picture.",
    answered: (d) => !!d.appearance.trim(),
  },
  {
    id: "profile-age",
    spoken: "How old is your child? You can skip this one.",
    screen: "How old is {name}? You can skip this one.",
    answered: (d) => d.age > 0,
  },
  {
    id: "profile-reading",
    spoken: "How does your child do with reading? For example: not reading yet, short simple sentences, or reads well.",
    screen: "How does {name} do with reading? For example: not reading yet, short simple sentences, or reads well.",
    answered: (d) => d.readingLevel !== "unknown",
  },
  {
    id: "profile-communication",
    spoken: "How does your child usually communicate? For example: full sentences, short phrases, single words, or a device or app.",
    screen: "How does {name} usually communicate? For example: full sentences, short phrases, single words, or a device or app.",
    answered: (d) => d.communication !== "unknown",
  },
  {
    id: "profile-hard",
    spoken: "What's hard for your child? Things like loud places, sudden noises, waiting, being touched, or meeting new people.",
    screen: "What's hard for {name}? Things like loud places, sudden noises, waiting, being touched, or meeting new people.",
    answered: (d) => d.hardThings.length > 0 || d.otherHardThings.length > 0,
  },
  {
    id: "profile-helps",
    spoken: "What helps your child when things get hard?",
    screen: "What helps {name} when things get hard?",
    answered: (d) => d.helps.length > 0,
  },
  {
    id: "profile-comfort",
    spoken: "Does your child have a comfort item, like a stuffed animal, a blanket, or headphones? If so, what does it look like?",
    screen: "Does {name} have a comfort item, like a stuffed animal, a blanket or headphones? If so, what does it look like?",
    answered: (d) => d.comforts.length > 0 && d.comforts.every((c) => !!c.appearance.trim()),
  },
  {
    id: "profile-loves",
    spoken: "What does your child love? Favorite things, topics, or characters.",
    screen: "What does {name} love? Favorite things, topics or characters.",
    answered: (d) => d.interests.length > 0,
  },
  {
    id: "profile-screen",
    spoken: "On a phone or tablet, what can your child do comfortably? Tap things, drag things around, or type?",
    screen: "On a phone or tablet, what can {name} do comfortably? Tap things, drag things around, or type?",
    answered: (d) => d.canTap !== "unknown" || d.canDrag !== "unknown" || d.canType !== "unknown",
  },
  {
    id: "profile-ways-in",
    spoken: "Does your child take in stories best by reading, by listening, or by playing games?",
    screen: "Does {name} take in stories best by reading, by listening, or by playing games?",
    answered: (d) => d.waysIn.length > 0,
  },
  {
    id: "profile-anything-else",
    spoken: "Is there anything else that would help us understand your child?",
    screen: "Is there anything else that would help us understand {name}?",
    answered: (d) => !!d.notes.trim(),
  },
];

export const questionById = (id: string) => PROFILE_QUESTIONS.find((q) => q.id === id);

/** The next question: the first one that hasn't been asked and isn't already answered. Undefined = done. */
export function nextProfileQuestion(draft: ProfileInterviewDraft, askedIds: string[]): BankQuestion | undefined {
  const asked = new Set(askedIds);
  return PROFILE_QUESTIONS.find((q) => !asked.has(q.id) && !q.answered(draft));
}

/** The question as shown on screen, with the child's name filled in. */
export function screenText(q: BankQuestion, draft: ProfileInterviewDraft): string {
  const name = draft.displayName.trim();
  return name ? q.screen.replaceAll("{name}", name) : q.spoken;
}

const PROFILE_LISTENER_RULES = `You help a parent, caregiver or teacher set up a profile for an autistic child, in an app that prepares children for new events with calm, honest picture stories. The app asks fixed questions; your job is only to record the answers.

You get the profile so far, the question just asked, and the answer. Return the updated profile.

- Fill in every field the answer covers, not only the one the question was about. ("He's 9, loud places are tough, a timer helps" fills age, hardThings and helps.)
- Record only what the user actually said. Never guess or fill in typical values. Keep everything already in the profile unless the answer corrects it.
- "I don't know", "not sure", "skip" or "no": change nothing.
- Map what they describe onto the fixed lists where it fits (e.g. "covers his ears when the blender goes" is sudden-noises); put anything else in otherHardThings or helps in their own words, briefly.
- Never record a diagnosis or medical condition (autism, ADHD, anxiety disorder and so on), even if the user mentions one. Record only what they describe the child doing, needing or finding hard.
- readingLevel: pre-verbal (not reading yet), early-reader (short simple sentences), reader (reads well), fluent-reader (strong reader, older child, teen or adult). Use "unknown" if not clear.
- communication: full-sentences, short-phrases, single-words, aac (a device or app), mostly-nonspeaking.
- comforts: each comfort item with its name and what it looks like ("" if not described).
- notes: for the "anything else" question, a short plain summary of what they said that doesn't fit another field. Leave diagnoses out.`;

export function buildProfileListenerPrompt(draft: ProfileInterviewDraft, questionId: string, answer: string) {
  const q = questionById(questionId);
  return {
    instructions: PROFILE_LISTENER_RULES,
    input: [
      "The profile so far (JSON):",
      JSON.stringify(draft, null, 2),
      "",
      `Question: ${q ? screenText(q, draft) : questionId}`,
      `Answer: ${answer}`,
    ].join("\n"),
  };
}

/**
 * Safety net under the prompt rule: diagnosis words never reach a saved
 * profile, even if the model slips. Drops any free-text line (or notes
 * sentence) that names one.
 */
const DIAGNOSIS = /\b(autis\w*|asd|adhd|aspergers?|asperger's|pda|ocd|spd|anxiety disorder|disorder|diagnos\w*|syndrome|spectrum|medication|meds)\b/i;
export const stripDiagnoses = (items: string[]) => items.filter((s) => !DIAGNOSIS.test(s));
const stripDiagnosisSentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !DIAGNOSIS.test(s))
    .join(" ")
    .trim();

export function cleanProfileDraft(draft: ProfileInterviewDraft): ProfileInterviewDraft {
  return {
    ...draft,
    otherHardThings: stripDiagnoses(draft.otherHardThings),
    helps: stripDiagnoses(draft.helps),
    appearance: DIAGNOSIS.test(draft.appearance) ? "" : draft.appearance,
    notes: stripDiagnosisSentences(draft.notes),
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
    comforts: d.comforts
      .filter((c) => c.name.trim())
      .map((c) => ({ id: slug(c.name), name: c.name.trim(), appearance: c.appearance.trim() || undefined })),
    interests: d.interests,
    screen: { tap: yes(d.canTap, true), drag: yes(d.canDrag, false), type: yes(d.canType, false) },
    waysIn: d.waysIn.length ? [...new Set(d.waysIn)] : undefined,
    notes: d.notes.trim() || undefined,
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
  const notes = stripDiagnosisSentences(d.notes);
  if (notes) out.push(`Also: ${notes}`);
  return out;
}
