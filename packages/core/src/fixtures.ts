import type { PlayerProfile } from "./profile.js";
import type { Event } from "./event.js";
import type { Story } from "./story.js";
import type { UserSettings } from "./region.js";

/**
 * Fake test family. Never replace these with real players' details.
 */

export const samplePlayer: PlayerProfile = {
  id: "player-sam",
  displayName: "Sam",
  readingLevel: "early-reader",
  artStyle: "hybrid",
  perspective: "first",
  sensory: { soundEnabled: true, narrationRate: 0.9, reduceMotion: true },
  reviewMode: "every-stage",
  appearance: "a seven-year-old boy with short curly brown hair and brown skin, wearing a green t-shirt and jeans",
  comforts: [
    {
      id: "bear",
      name: "Bear",
      // Brad: describe Bear however you like; this becomes his reference drawing.
      appearance: "a small, fluffy, white bunny with a light grey patch on it's stomach with slightly bent ears and a faded red bow tie around it's neck",
    },
    {
      id: "headphones",
      name: "headphones",
      appearance: "big, soft, dark gray over-ear headphones",
    },
  ],
  interests: ["trains"],
};

export const sampleEvent: Event = {
  id: "event-dr-patel",
  playerId: "player-sam",
  title: "Visit to Dr. Patel",
  kind: "doctor",
  startsAt: "2026-11-03T10:00:00-05:00",
  purpose: "to get a flu shot that helps my body stay healthy",
  companions: [
    {
      id: "c-dad",
      name: "Dad",
      role: "parent",
      appearance: "a tall man with short curly black hair, a short beard and round glasses, wearing a blue sweater",
      facts: [],
    },
  ],
  people: [
    {
      id: "p-patel",
      name: "Dr. Patel",
      role: "doctor",
      appearance: "a woman doctor with long black hair in a low bun, wearing a white coat over a purple top",
      facts: ["Dr. Patel has a fish tank in the waiting room."],
    },
  ],
  places: [
    {
      id: "pl-office",
      name: "Dr. Patel's office",
      photos: [],
      sensoryNotes: ["the waiting room can be noisy"],
    },
  ],
  // Brad: describe the car however you like; it gets its own reference drawing.
  transport: { mode: "car", name: "the blue car", appearance: "a small light blue hatchback car" },
  steps: [
    { id: "s1", description: "We drive to the building with the blue door.", personIds: [], fixed: false },
    { id: "s2", description: "We wait in the waiting room.", placeId: "pl-office", personIds: [], fixed: false },
    { id: "s3", description: "Dr. Patel gives me a shot.", placeId: "pl-office", personIds: ["p-patel"], fixed: true },
    { id: "s4", description: "We go home.", personIds: [], fixed: false },
  ],
  hardParts: [
    { id: "h1", description: "waiting", stepId: "s2" },
    { id: "h2", description: "the shot", stepId: "s3" },
  ],
  comforts: [],
  status: "draft",
};

/** The test user: lives in the US, so drivers sit on the left. */
export const sampleUser: UserSettings = {
  region: { country: "US", drivesOn: "right" },
};

/**
 * Named test events for `pnpm write-story <name>`.
 * Add new scenarios here; the name is what you type on the command line.
 */
export const sampleEvents: Record<string, Event> = {
  doctor: sampleEvent,
};

/** A story that passes validation. */
export const sampleStory: Story = {
  title: "My Visit to Dr. Patel",
  answers: ["who", "what", "when", "where", "why", "how"],
  pages: [
    {
      section: "introduction",
      inPicture: ["p-patel"],
      sceneBrief: "Dr. Patel smiles in her office.",
      sentences: [
        { text: "On Tuesday morning, I am going to see Dr. Patel.", type: "descriptive" },
        { text: "Dr. Patel is a doctor who helps kids stay healthy.", type: "descriptive" },
      ],
    },
    {
      section: "body",
      stepId: "s1",
      inPicture: ["player", "c-dad", "transport"],
      sceneBrief: "Sam and Dad walk to the blue car, parked on a quiet street.",
      sentences: [
        { text: "Dad and I drive to the building with the blue door.", type: "descriptive" },
      ],
    },
    {
      section: "body",
      stepId: "s2",
      inPicture: ["player", "c-dad"],
      sceneBrief: "Sam and Dad sit together in the waiting room near a fish tank.",
      sentences: [
        { text: "We wait in the waiting room. It can be noisy.", type: "descriptive" },
        { text: "There is a fish tank to look at.", type: "descriptive" },
        { text: "Waiting can feel long. That is okay.", type: "affirmative" },
        { text: "I can wear my headphones while I wait.", type: "coaching" },
      ],
    },
    {
      section: "body",
      stepId: "s3",
      inPicture: ["player", "c-dad", "p-patel", "bear"],
      sceneBrief: "Dr. Patel talks with Sam, who sits with Dad and holds Bear.",
      sentences: [
        { text: "Dr. Patel gives me a shot in my arm.", type: "descriptive" },
        { text: "The shot pinches for a few seconds.", type: "descriptive" },
        { text: "I can hold Bear or squeeze Dad's hand.", type: "coaching" },
      ],
    },
    {
      section: "conclusion",
      inPicture: ["player", "c-dad"],
      sceneBrief: "Sam and Dad walk out of the building together.",
      sentences: [
        { text: "Then we go home.", type: "descriptive" },
        { text: "The shot helps my body stay healthy.", type: "descriptive" },
      ],
    },
  ],
};
