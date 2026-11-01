import { Event } from "./event.js";
import type { PlayerProfile } from "./profile.js";

/**
 * "All about me": the first story a child gets, made right after their
 * profile is set up. It's affirming (Gray: at least half of stories should
 * affirm, not prepare for something hard), it links the drawn character to
 * the child ("this is me"), and it shows how the app works on a story with
 * nothing hard in it. Built only from what the user said in the profile.
 */
export const ABOUT_ME_KIND = "about-me";

export const aboutMeId = (playerId: string) => `${playerId.replace(/^player-/, "")}-about-me`;

export function aboutMeEvent(player: PlayerProfile): Event {
  const name = player.displayName.trim() || "me";
  const steps: Array<{ id: string; description: string }> = [
    // Step text is notes for the writer, not final wording: appearance strings
    // vary ("a seven-year-old boy with curly hair", "curly hair, glasses").
    { id: "me", description: `This is me, ${name}.${player.appearance ? ` What I look like: ${player.appearance}.` : ""}` },
  ];
  if (player.interests.length) steps.push({ id: "love", description: `I love ${listOf(player.interests)}.` });
  const comforts = player.comforts.map((c) => c.name).filter(Boolean);
  const helps = player.helps.filter(Boolean);
  if (comforts.length || helps.length) {
    steps.push({
      id: "helps",
      description: [
        comforts.length ? `${listOf(comforts)} ${comforts.length > 1 ? "are" : "is"} with me when I need ${comforts.length > 1 ? "them" : "it"}.` : "",
        helps.length ? `Things that help me: ${listOf(helps)}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  }
  const tap = player.screen.tap !== false;
  steps.push({
    id: "app",
    description: [
      "My stories are in this app.",
      tap ? "I can tap the arrow to see the next page, or go back." : "A grown-up can turn the pages with me.",
      player.sensory.soundEnabled ? "I can tap the speaker to hear the words." : "",
      "I can read my stories again whenever I want.",
    ]
      .filter(Boolean)
      .join(" "),
  });

  return Event.parse({
    id: aboutMeId(player.id),
    playerId: player.id,
    title: `All about ${name}`,
    kind: ABOUT_ME_KIND,
    startsAt: "",
    purpose: `to get to know ${name} and how this app works`,
    steps: steps.map((s) => ({ ...s, personIds: [], fixed: false })),
  });
}

function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
