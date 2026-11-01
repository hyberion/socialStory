import type { DetailLevel, PlayerProfile, ReadingLevel } from "./profile.js";
import { READING_LIMITS } from "./reading.js";
import { HARD_THING_PROMPTS } from "./onboarding.js";
import { dateWords, timeWords, wallClock } from "./when.js";
import type { Event } from "./event.js";
import type { Story } from "./story.js";
import type { Issue } from "./validate.js";
import { castFor, comfortsFor } from "./cast.js";

/**
 * Prompt text for the story writer. Kept in core (not the API) so the
 * rules live next to the validator that enforces them, and so prompts
 * can be read, tested and tuned without touching any AI plumbing.
 */

/** How much text each reading level gets (principle 1: adapt to the player). Numbers come from READING_LIMITS. */
const READING_LEVEL_INTRO: Record<ReadingLevel, string> = {
  "pre-verbal": "The child does not read yet and will hear the story read aloud. Use only common, concrete words.",
  "early-reader": "The child is an early reader. Use simple, concrete words.",
  reader: "The child reads well. Still use plain, concrete words.",
  "fluent-reader":
    "The reader reads fluently and may be a teenager or an adult. Use plain, precise words and a respectful, matter-of-fact tone that fits their age. Nothing babyish.",
};

function readingLevelRule(level: ReadingLevel): string {
  const l = READING_LIMITS[level];
  const sentences = l.maxSentencesPerPage === 1 ? "one sentence per page" : `1 to ${l.maxSentencesPerPage} sentences per page`;
  return `${READING_LEVEL_INTRO[level]} Use ${sentences}, each at most ${l.maxWords} words. ${l.pages[0]} to ${l.pages[1]} pages. These limits are checked.`;
}

/** How much information the story gives, separate from how many words (principle 1). */
const DETAIL_RULES: Record<DetailLevel, string> = {
  essentials:
    "Detail: essentials only. Give the steps in order, one idea per page, and the coping choices for hard parts. Leave out extra description.",
  standard:
    "Detail: standard. Give each step, how things look, sound and feel (use the sensory notes), and coping choices for hard parts.",
  more:
    "Detail: more. Also explain why things happen, using only reasons in the event details (the purpose, people's roles); if no reason is given, describe what happens without inventing one. Also say what other people are doing or may be thinking.",
  full:
    "Detail: full picture. Also include honest, general what-ifs (\"Sometimes the doctor is running late. Then we wait a little longer.\") each with a choice the child controls, offer choices at more steps, and use a more grown-up, matter-of-fact tone. Keep the 2 to 1 describing-to-coaching balance.",
};

const RULES = `You write Social Stories for autistic children, following Carol Gray's Social Story criteria.
A Social Story gives accurate, reassuring information about what will happen. It does not tell the child how they must behave.

Structure
- A clear title.
- Page 1 is the introduction (section "introduction"). The last page is the conclusion (section "conclusion"). Everything between is "body".
- Body pages follow the event's steps in order. Set each body page's stepId to the step it shows; use an empty string "" for pages that show no specific step.
- The story must answer who, what, when, where, why and how. List all six in "answers", and make sure the text really answers each one.
- The conclusion restates the main reassuring point: the event is finished and why it mattered ("The visit is done. The shot helps my body stay healthy."). Do not repeat the last body page; if the last step is going home, the conclusion must not say "go home" again. Do not end on vague statements about feelings.

Facts: use only what you are given
- Every fact in the story must come from the event details below: the people, places, steps, sensory notes and comfort items.
- Never add things that will happen, be seen, be heard or be given (no stickers, toys, treats, animals, vehicles or rewards) unless the event details list them.
- The child's interests may only shape word choice or a comparison the child already knows. They must never add something to the event. Wrong: "I may see trains from the car." The event never mentions trains.
- If a detail is missing, leave it out rather than guessing.
- Only name the companions listed as coming with the child. If none are listed, write only about the child: do not say "we" and do not mention family or anyone else coming.

Sentence types (tag every sentence)
- "descriptive": true facts about what will happen, what things look, sound and feel like.
- "perspective": what people may think or feel ("Many kids feel nervous at the doctor.").
- "affirmative": a calm shared value ("That is okay.").
- "coaching": a gentle option the child can choose ("I can hold Bear while I wait.").
- Describing sentences (descriptive + perspective + affirmative) must outnumber coaching sentences at least 2 to 1. Use few coaching sentences.

Voice and honesty
- Patient, calm, literal and true. No idioms, figures of speech or jokes.
- Never promise what the world can break. Never say it won't hurt, or that there is nothing to be scared of. Say how it really feels: "The shot pinches for a few seconds."
- Never dictate behavior. Do not use "must", "have to", "has to", "not allowed", "good boy" or "good girl".
- Avoid absolutes like "always" and "never". Use "usually" or "often".
- Never dismiss feelings ("don't cry", "don't worry"). Feelings are okay.
- Steps marked FIXED will happen no matter what. Be honest that they happen, then offer real choices around them using the child's comfort items.
- For hard parts, describe them plainly and give the child at least one option they control.
- Do not write in second person ("you"). Use the perspective given below.

Scene briefs
- Page 1 (the introduction) shows who the event is with: the first person the child will meet, alone, calm and friendly, at their place (for example Dr. Patel in her office). Do not show the child or companions on page 1. If no people are listed, page 1 shows the place. The app adds a calendar and clock beside this picture, so do not draw them.
- For every page, write a short sceneBrief: what the picture on that page shows, in one plain sentence, for an illustrator.
- The picture must match that page's text. If the text says the room can be noisy, do not call it quiet.
- Show only the child, the listed companions, and the listed people. Never add family members, other children or strangers.
- The sceneBrief must name, by their exact names, everyone and every comfort item shown, and no one else. Name only who is really there in that moment: the doctor is not in the car, and people the child will meet appear only where the steps say they are.
- For every page, set inPicture to the cast ids of everyone and every comfort item shown in the picture, using only ids from the picture cast list. Use an empty list for a picture of only a place.
- Comfort items belong to the child. When the text says the child holds or uses one, the picture shows the child holding or using it, and its id goes in inPicture. Never show a different toy or object in its place.
- Never set a picture inside a car, bus or other vehicle. Show travel from the outside: walking to the vehicle, standing beside it, or the vehicle on the road or parked at the place. The text can still say "we drive"; only the picture stays outside.
- If the vehicle is in the picture, name it by its exact cast name and put its id in inPicture.
- Calm scenes only: no scary faces, needles close up, or crying.`;

function formatEvent(event: Event, player: PlayerProfile): string {
  const people = new Map(event.people.map((p) => [p.id, p]));
  const places = new Map(event.places.map((p) => [p.id, p]));
  // The event's own wall-clock time (not the server's time zone); empty = not decided.
  const t = wallClock(event.startsAt);
  const when = t ? `${dateWords(t)}, ${timeWords(t)}` : "not decided yet (do not mention a day or time)";
  const comforts = comfortsFor(event, player).map((c) => c.name);

  const lines = [
    `Event: ${event.title} (${event.kind})`,
    `When: ${when}`,
    event.purpose ? `Why it is happening: ${event.purpose}` : null,
    "",
    `Coming with the child: ${
      event.companions.length
        ? event.companions.map((c) => `${c.name}${c.role ? ` (${c.role})` : ""}`).join(", ")
        : "not given"
    }`,
    "",
    "People the child will meet:",
    ...event.people.map(
      (p) => `- ${p.name}${p.role ? ` (${p.role})` : ""}${p.facts.length ? `: ${p.facts.join(" ")}` : ""}`,
    ),
    "",
    "Places:",
    ...event.places.map(
      (p) => `- ${p.name}${p.sensoryNotes.length ? `. Sensory notes: ${p.sensoryNotes.join("; ")}` : ""}`,
    ),
    "",
    "Steps, in order:",
    ...event.steps.map((s) => {
      const where = s.placeId ? ` [at ${places.get(s.placeId)?.name ?? s.placeId}]` : "";
      const who = s.personIds.length
        ? ` [with ${s.personIds.map((id) => people.get(id)?.name ?? id).join(", ")}]`
        : "";
      return `- stepId "${s.id}": ${s.description}${where}${who}${s.fixed ? " (FIXED)" : ""}`;
    }),
    "",
    event.transport ? `Getting there: ${event.transport.mode}, called "${event.transport.name}"` : null,
    "",
    event.notes ? `Other details from the user (true facts you may use): ${event.notes}` : null,
    "",
    "Hard parts to expect:",
    ...(event.hardParts.length ? event.hardParts.map((h) => `- ${h.description}`) : ["- none listed"]),
    "",
    `Comfort items and choices available: ${comforts.length ? comforts.join(", ") : "none listed"}`,
    "",
    "Picture cast (ids for inPicture):",
    ...castFor(event, player).map((m) => `- "${m.id}": ${m.name} (${m.role})`),
  ];
  return lines.filter((l) => l !== null).join("\n");
}

function formatPlayer(player: PlayerProfile): string {
  const perspective =
    player.perspective === "first"
      ? `Write in first person, as the child ("I", "my"). The child's name is ${player.displayName}.`
      : `Write in third person about ${player.displayName} ("${player.displayName} goes...").`;
  const hard = [...player.hardThings.map((h) => HARD_THING_PROMPTS[h]), ...player.otherHardThings];
  const hardRule = hard.length
    ? `Things that are hard for this child: ${hard.join(", ")}. When the event includes one of these, describe it honestly and plainly, and offer a choice the child controls. Never add one that the event details don't include.`
    : "";
  const helpsRule = player.helps.length
    ? `Things that help this child: ${player.helps.join("; ")}. Use these as choices where they fit the moment.`
    : "";
  const communicationRule =
    player.communication && player.communication !== "full-sentences"
      ? "The child may not use many spoken words. Never write choices that depend on speaking (\"I can tell the doctor\"); offer choices the child can show instead (pointing, a card, a hand squeeze, looking away)."
      : "";
  const notesRule = player.notes?.trim()
    ? `Background from the parent, to help you understand the child (never a source of facts about the event): ${player.notes.trim()}`
    : "";
  const interests = player.interests.length
    ? `The child likes: ${player.interests.join(", ")}. These may shape word choice only; never add them to the event as things that will happen or be seen.`
    : "";
  return [
    readingLevelRule(player.readingLevel),
    DETAIL_RULES[player.detailLevel],
    perspective,
    hardRule,
    helpsRule,
    communicationRule,
    notesRule,
    interests,
  ]
    .filter(Boolean)
    .join("\n");
}

export interface StoryPrompt {
  instructions: string;
  input: string;
}

/** The first request: write a story for this event and player. */
export function buildStoryPrompt(event: Event, player: PlayerProfile): StoryPrompt {
  return {
    instructions: `${RULES}\n\nAbout this child\n${formatPlayer(player)}`,
    input: `Write a Social Story for this event.\n\n${formatEvent(event, player)}`,
  };
}

/** A follow-up request: fix a story that failed validation. */
export function buildRevisionPrompt(
  event: Event,
  player: PlayerProfile,
  story: Story,
  issues: Issue[],
): StoryPrompt {
  const problems = issues
    .filter((i) => i.severity === "error")
    .map((i) => `- ${i.page !== undefined ? `Page ${i.page + 1}: ` : ""}${i.message}`)
    .join("\n");
  return {
    instructions: `${RULES}\n\nAbout this child\n${formatPlayer(player)}`,
    input: [
      "This Social Story failed review. Fix every problem below and return the complete corrected story.",
      "Change only what is needed to fix the problems; keep everything else the same.",
      "",
      "Problems:",
      problems,
      "",
      "The event:",
      formatEvent(event, player),
      "",
      "The story to fix (JSON):",
      JSON.stringify(story, null, 2),
    ].join("\n"),
  };
}

/**
 * "Rewrite this page": the whole story for context, one page to replace.
 * The user's note is guidance, never a way around the rules.
 */
export function buildPageRewritePrompt(
  event: Event,
  player: PlayerProfile,
  story: Story,
  pageIndex: number,
  note?: string,
): StoryPrompt {
  const page = story.pages[pageIndex];
  if (!page) throw new Error(`No page ${pageIndex + 1}`);
  return {
    instructions: `${RULES}\n\nAbout this child\n${formatPlayer(player)}`,
    input: [
      `Rewrite page ${pageIndex + 1} of this Social Story. Return only that one page.`,
      `Keep its section ("${page.section}")${page.stepId ? ` and stepId ("${page.stepId}")` : ""}. Keep it consistent with the pages around it, and follow every rule above.`,
      note?.trim()
        ? `The parent asked: "${note.trim()}". Follow this where it fits the rules and the event details; never add facts the event doesn't give.`
        : "Write a fresh version of the same moment.",
      "",
      "The event:",
      formatEvent(event, player),
      "",
      "The whole story (JSON), for context:",
      JSON.stringify(story, null, 2),
    ].join("\n"),
  };
}
