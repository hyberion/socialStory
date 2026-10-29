import type { KitSummary } from "@socialstory/core";
import { kitFileUrl } from "./api";
import { canPlayWhosWho } from "./WhosWho";

export type Activity = "story" | "whos-who";

/**
 * The child's story shelf: big covers, nothing else to tap.
 * Soonest event first, so the one that matters most is easiest to reach.
 */
export function Shelf({ kits, onOpen }: { kits: KitSummary[]; onOpen: (id: string, activity: Activity) => void }) {
  if (kits.length === 0) {
    return (
      <main className="shelf empty">
        <p className="calm">Your stories will be here soon.</p>
      </main>
    );
  }
  return (
    <main className="shelf">
      <h1 className="title">My stories</h1>
      <ul className="covers">
        {kits.map((kit) => (
          <li key={kit.id} className="shelf-item">
            <button className="cover" onClick={() => onOpen(kit.id, "story")}>
              {kit.cover ? (
                <img src={kitFileUrl(kit.id, kit.cover)} alt="" />
              ) : (
                <span className="picture" aria-hidden="true" />
              )}
              <span className="cover-title">{kit.title}</span>
            </button>
            {canPlayWhosWho(kit.portraits) && (
              <button className="activity" onClick={() => onOpen(kit.id, "whos-who")}>
                Who's who?
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
