import type { PlayerProfile, ReadingLevel } from "./profile.js";
import type { Event } from "./event.js";
import type { Story } from "./story.js";
import type { Issue } from "./validate.js";
import { castFor, comfortsFor } from "./cast.js";

/**
 * Prompt text for the story writer. Kept in core (not the API) so the
 * rules live next to the validator that enforces them, and so prompts
 * can be read, tested and tuned without touching any AI plumbing.
 */

/** How much text each reading level gets (principle 1: adapt to the player). */
const READING_LEVEL_RULES: Record<ReadingLevel, string> = {
  "pre-verbal":
    "The child does not read yet and will hear the story read aloud. Use one very short sentence per page (about 3 to 6 words). Use only common, concrete words. 6 to 8 pages.",
  "early-reader":
    "The child is an early reader. Use 1 to 3 short sentences per page, each under 10 words. Use simple, concrete words. 6 to 10 pages.",
  reader:
    "The child reads well. Use up to 4 sentences per page, each under 16 words. Still use plain, concrete words. 8 to 12 pages.",
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
  const when = new Date(event.startsAt).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
  const interests = player.interests.length
    ? `The child likes: ${player.interests.join(", ")}. These may shape word choice only; never add them to the event as things that will happen or be seen.`
    : "";
  return [READING_LEVEL_RULES[player.readingLevel], perspective, interests].filter(Boolean).join("\n");
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
