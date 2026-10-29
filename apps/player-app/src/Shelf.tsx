import type { KitSummary } from "@socialstory/core";
import { kitFileUrl } from "./api";

/**
 * The child's story shelf: big covers, nothing else to tap.
 * Soonest event first, so the one that matters most is easiest to reach.
 */
export function Shelf({ kits, onOpen }: { kits: KitSummary[]; onOpen: (id: string) => void }) {
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
          <li key={kit.id}>
            <button className="cover" onClick={() => onOpen(kit.id)}>
              {kit.cover ? (
                <img src={kitFileUrl(kit.id, kit.cover)} alt="" />
              ) : (
                <span className="picture" aria-hidden="true" />
              )}
              <span className="cover-title">{kit.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
