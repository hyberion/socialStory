import type { PlayerProfile } from "./profile.js";
import type { ComfortItem, Event, PhotoRef } from "./event.js";

/**
 * Everything that can appear in an event's pictures with a fixed look:
 * the player, the companions coming along, the people they'll meet,
 * and the player's comfort items ("props"). Each gets a stable id;
 * story pages list these ids in `inPicture`, and the illustrator sends
 * only those reference portraits.
 */
export interface CastMember {
  id: string;
  kind: "person" | "prop";
  name: string;
  role: string;
  appearance?: string;
  /** A real photo to draw this member from, if the user added one. */
  photo?: PhotoRef;
}

/** The player's cast id. Always present. */
export const PLAYER_CAST_ID = "player";

/** The player's standing comfort items plus this event's, without duplicates (by id). */
export function comfortsFor(event: Event, player: PlayerProfile): ComfortItem[] {
  const byId = new Map<string, ComfortItem>();
  for (const item of [...player.comforts, ...event.comforts]) if (!byId.has(item.id)) byId.set(item.id, item);
  return [...byId.values()];
}

export function castFor(event: Event, player: PlayerProfile): CastMember[] {
  return [
    { id: PLAYER_CAST_ID, kind: "person", name: player.displayName, role: "the child", appearance: player.appearance },
    ...event.companions.map((c) => ({
      id: c.id,
      kind: "person" as const,
      name: c.name,
      role: c.role ?? "comes with the child",
      appearance: c.appearance,
      photo: c.photo,
    })),
    ...event.people.map((p) => ({
      id: p.id,
      kind: "person" as const,
      name: p.name,
      role: p.role ?? "someone the child will meet",
      appearance: p.appearance,
      photo: p.photo,
    })),
    ...comfortsFor(event, player).map((item) => ({
      id: item.id,
      kind: "prop" as const,
      name: item.name,
      role: "the child's comfort item",
      appearance: item.appearance,
      photo: item.photo,
    })),
  ];
}
