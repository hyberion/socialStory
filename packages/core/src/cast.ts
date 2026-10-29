import type { ChildProfile } from "./profile.js";
import type { Event } from "./event.js";

/**
 * Everyone who can appear in an event's pictures: the child, the
 * companions coming along, and the people they'll meet. Each gets a
 * stable id; story pages list these ids in `inPicture`, and the
 * illustrator sends only those characters' reference portraits.
 */
export interface CastMember {
  id: string;
  name: string;
  role: string;
  appearance?: string;
}

/** The child's cast id. Always present. */
export const CHILD_CAST_ID = "child";

export function castFor(event: Event, child: ChildProfile): CastMember[] {
  return [
    { id: CHILD_CAST_ID, name: child.displayName, role: "the child", appearance: child.appearance },
    ...event.companions.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role ?? "comes with the child",
      appearance: c.appearance,
    })),
    ...event.people.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role ?? "someone the child will meet",
      appearance: p.appearance,
    })),
  ];
}
