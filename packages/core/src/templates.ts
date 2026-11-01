import { Event, type Person, type Place } from "./event.js";

/**
 * Starting points for common events. A template writes out the usual
 * process once (arrive, wait, nurse, exam room, doctor...) so the user
 * edits instead of starting from a blank page, and learns what a good
 * event description looks like along the way.
 *
 * Templates are starting points, never facts about a real place: every
 * step is shown to the user to keep, change or remove. Steps marked
 * "sometimes" are left out unless the user includes them, because the
 * story must never promise something that won't happen (principle 6).
 * People are named by role ("the nurse") until the user gives real names.
 */

export interface TemplateStep {
  id: string;
  description: string;
  placeId?: string;
  personIds?: string[];
  /** Will happen no matter what, once the user keeps it (the shot, the cut). */
  fixed?: boolean;
  /** "usually" steps are included by default; "sometimes" steps only if the user picks them. */
  how: "usually" | "sometimes";
}

export interface EventTemplate {
  kind: string;
  /** Shown in the template picker. */
  label: string;
  summary: string;
  title: string;
  purpose: string;
  people: Person[];
  places: Place[];
  steps: TemplateStep[];
  hardParts: Array<{ description: string; stepId?: string }>;
  /** Suggestions shown to the user; never added to the event on their own. */
  comfortIdeas: string[];
  /** Questions that turn the template into this child's event. */
  askTheUser: string[];
}

const person = (id: string, name: string, role: string): Person => ({ id, name, role, facts: [] });
const place = (id: string, name: string, sensoryNotes: string[]): Place => ({ id, name, photos: [], sensoryNotes });

export const EVENT_TEMPLATES: Record<string, EventTemplate> = {
  doctor: {
    kind: "doctor",
    label: "Doctor visit",
    summary: "A check-up or a shot at the doctor's office.",
    title: "Visit to the doctor",
    purpose: "to check that my body is healthy",
    people: [
      person("p-desk", "the person at the front desk", "front desk"),
      person("p-nurse", "the nurse", "nurse"),
      person("p-doctor", "the doctor", "doctor"),
    ],
    places: [
      // The building first (its front door is the first thing the child sees), then rooms inside it.
      place("pl-office", "the doctor's office", ["the waiting room can be noisy", "other people wait there too"]),
      place("pl-exam", "the exam room", ["the bed has crinkly paper on it", "the lights are bright"]),
    ],
    steps: [
      { id: "t1", description: "We go to the doctor's office.", how: "usually" },
      { id: "t2", description: "We check in at the front desk.", placeId: "pl-office", personIds: ["p-desk"], how: "usually" },
      { id: "t3", description: "We wait in the waiting room.", placeId: "pl-office", how: "usually" },
      { id: "t4", description: "The nurse calls my name and walks us to an exam room.", placeId: "pl-exam", personIds: ["p-nurse"], how: "usually" },
      { id: "t5", description: "The nurse checks how tall I am and how much I weigh.", placeId: "pl-exam", personIds: ["p-nurse"], how: "usually" },
      { id: "t6", description: "The nurse takes my temperature and puts a soft cuff on my arm that squeezes.", placeId: "pl-exam", personIds: ["p-nurse"], how: "sometimes" },
      { id: "t7", description: "We wait in the exam room for the doctor.", placeId: "pl-exam", how: "usually" },
      { id: "t8", description: "The doctor comes in and says hello.", placeId: "pl-exam", personIds: ["p-doctor"], how: "usually" },
      { id: "t9", description: "The doctor listens to my heart and looks in my ears and mouth.", placeId: "pl-exam", personIds: ["p-doctor"], how: "usually" },
      { id: "t10", description: "I get a shot in my arm.", placeId: "pl-exam", personIds: ["p-nurse"], fixed: true, how: "sometimes" },
      { id: "t11", description: "We leave and go home.", how: "usually" },
    ],
    hardParts: [
      { description: "waiting", stepId: "t3" },
      { description: "the shot", stepId: "t10" },
    ],
    comfortIdeas: ["headphones", "a favorite stuffed animal", "a fidget toy", "a book or tablet for waiting"],
    askTheUser: [
      "What's the doctor's name, and what do they look like? Has your child met them before?",
      "Is there a shot or a test planned?",
      "Is there anything in the waiting room your child might like, like a fish tank, toys, or books?",
    ],
  },

  haircut: {
    kind: "haircut",
    label: "Haircut",
    summary: "A haircut at a salon or barbershop.",
    title: "Getting a haircut",
    purpose: "to make my hair shorter and neat",
    people: [person("p-stylist", "the hairdresser", "hairdresser")],
    places: [place("pl-salon", "the hair salon", ["it smells like shampoo", "hair dryers can be loud"])],
    steps: [
      { id: "t1", description: "We go to the hair salon.", how: "usually" },
      { id: "t2", description: "We wait for our turn.", placeId: "pl-salon", how: "usually" },
      { id: "t3", description: "I sit in a big chair. It can go up and down.", placeId: "pl-salon", personIds: ["p-stylist"], how: "usually" },
      { id: "t4", description: "The hairdresser puts a cape around my neck to keep hair off my clothes.", placeId: "pl-salon", personIds: ["p-stylist"], how: "usually" },
      { id: "t5", description: "The hairdresser sprays a little water on my hair.", placeId: "pl-salon", personIds: ["p-stylist"], how: "sometimes" },
      { id: "t6", description: "The hairdresser cuts my hair with scissors.", placeId: "pl-salon", personIds: ["p-stylist"], fixed: true, how: "usually" },
      { id: "t7", description: "The hairdresser uses clippers. They buzz and tickle.", placeId: "pl-salon", personIds: ["p-stylist"], how: "sometimes" },
      { id: "t8", description: "The hairdresser brushes the little hairs off my neck.", placeId: "pl-salon", personIds: ["p-stylist"], how: "usually" },
      { id: "t9", description: "I look in the mirror at my new haircut.", placeId: "pl-salon", how: "usually" },
      { id: "t10", description: "We pay and go home.", how: "usually" },
    ],
    hardParts: [
      { description: "the buzzing clippers", stepId: "t7" },
      { description: "itchy little hairs on my neck", stepId: "t8" },
    ],
    comfortIdeas: ["headphones", "a favorite toy to hold", "a show on a tablet"],
    askTheUser: [
      "What's the hairdresser's name, and what do they look like?",
      "Will they use scissors, clippers, or both?",
      "Has your child been to this salon before? Do they mind water sprayed on their head?",
    ],
  },

  "new-school": {
    kind: "school",
    label: "First day at a new school",
    summary: "Starting at a new school or a new class.",
    title: "My first day at my new school",
    purpose: "to learn and make friends in a new place",
    people: [person("p-teacher", "my teacher", "teacher")],
    places: [
      place("pl-school", "my new school", []),
      place("pl-classroom", "my classroom", ["lots of kids talk at once", "there are many things on the walls"]),
      place("pl-cafeteria", "the cafeteria", ["it can be very loud"]),
    ],
    steps: [
      { id: "t1", description: "I go to my new school.", placeId: "pl-school", how: "usually" },
      { id: "t2", description: "My teacher says hello and shows me my classroom.", placeId: "pl-classroom", personIds: ["p-teacher"], how: "usually" },
      { id: "t3", description: "I put my backpack in my cubby or on my hook.", placeId: "pl-classroom", how: "usually" },
      { id: "t4", description: "The class does the morning routine together.", placeId: "pl-classroom", personIds: ["p-teacher"], how: "usually" },
      { id: "t5", description: "I eat lunch in the cafeteria.", placeId: "pl-cafeteria", how: "usually" },
      { id: "t6", description: "I go outside for recess.", how: "sometimes" },
      { id: "t7", description: "A bell rings to show it is time for something new.", how: "sometimes" },
      { id: "t8", description: "School is over and I go home.", how: "usually" },
    ],
    hardParts: [
      { description: "a loud cafeteria", stepId: "t5" },
      { description: "the sudden bell", stepId: "t7" },
    ],
    comfortIdeas: ["headphones", "a small comfort item in the backpack", "a photo from home"],
    askTheUser: [
      "What's the teacher's name, and what do they look like?",
      "Does the school have bells?",
      "Is there a quiet place your child can go if it gets to be too much?",
    ],
  },

  "new-baby": {
    kind: "family",
    label: "Meeting a new baby",
    summary: "Meeting a new baby brother, sister or cousin.",
    title: "Meeting the new baby",
    purpose: "to meet the newest person in our family",
    people: [person("p-baby", "the baby", "new baby")],
    places: [place("pl-visit", "where the baby is", ["the baby may be sleeping, so people talk quietly"])],
    steps: [
      { id: "t1", description: "We go to see the new baby.", how: "usually" },
      { id: "t2", description: "We wash our hands before we touch the baby.", placeId: "pl-visit", how: "usually" },
      { id: "t3", description: "The baby is very small. The baby may be sleeping.", placeId: "pl-visit", personIds: ["p-baby"], how: "usually" },
      { id: "t4", description: "The baby may cry. Crying is how babies talk.", placeId: "pl-visit", personIds: ["p-baby"], how: "usually" },
      { id: "t5", description: "I can hold the baby while I sit down, with a grown-up helping.", placeId: "pl-visit", personIds: ["p-baby"], how: "sometimes" },
      { id: "t6", description: "The grown-ups may be busy and tired.", placeId: "pl-visit", how: "usually" },
      { id: "t7", description: "We say goodbye and go home.", how: "usually" },
    ],
    hardParts: [
      { description: "sudden loud crying", stepId: "t4" },
      { description: "grown-ups paying attention to the baby", stepId: "t6" },
    ],
    comfortIdeas: ["headphones", "a favorite toy", "a quiet activity to bring"],
    askTheUser: [
      "What's the baby's name, and how is the baby related to your child?",
      "Will the visit be at a hospital or at someone's home?",
      "Will your child be offered a chance to hold the baby?",
    ],
  },
};

/**
 * Builds an Event from a template: "usually" steps, plus any "sometimes"
 * steps the user picked. Hard parts follow their steps.
 */
export function eventFromTemplate(
  template: EventTemplate,
  args: { id: string; playerId: string; startsAt: string; include?: string[] },
): Event {
  const include = new Set(args.include ?? []);
  const steps = template.steps.filter((s) => s.how === "usually" || include.has(s.id));
  const kept = new Set(steps.map((s) => s.id));
  return Event.parse({
    id: args.id,
    playerId: args.playerId,
    title: template.title,
    kind: template.kind,
    startsAt: args.startsAt,
    purpose: template.purpose,
    companions: [],
    people: template.people,
    places: template.places,
    steps: steps.map(({ id, description, placeId, personIds, fixed }) => ({
      id,
      description,
      placeId,
      personIds: personIds ?? [],
      fixed: !!fixed,
    })),
    hardParts: template.hardParts
      .filter((h) => !h.stepId || kept.has(h.stepId))
      .map((h, i) => ({ id: `h${i + 1}`, ...h })),
  });
}
