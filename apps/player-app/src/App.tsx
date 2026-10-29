import { useEffect, useState } from "react";
import type { KitSummary, PublishedKit } from "@socialstory/core";
import { fetchKit, fetchKits } from "./api";
import { Shelf } from "./Shelf";
import { StoryViewer } from "./StoryViewer";

type State =
  | { kind: "loading" }
  | { kind: "shelf"; kits: KitSummary[] }
  | { kind: "reading"; kit: PublishedKit; kits: KitSummary[] };

/**
 * Shelf -> story -> shelf. Offline, the service worker answers from the
 * last kits it saw. If nothing is reachable, the child sees the same calm
 * empty shelf as when nothing is published: no error messages on this side.
 */
export function App() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    fetchKits()
      .then((kits) => setState({ kind: "shelf", kits }))
      .catch((err) => {
        console.warn("Could not load stories", err);
        setState({ kind: "shelf", kits: [] });
      });
  }, []);

  if (state.kind === "loading") return <main className="shelf empty" aria-busy="true" />;

  if (state.kind === "reading") {
    return <StoryViewer kit={state.kit} onHome={() => setState({ kind: "shelf", kits: state.kits })} />;
  }

  const { kits } = state;
  return (
    <Shelf
      kits={kits}
      onOpen={(id) =>
        fetchKit(id)
          .then((kit) => setState({ kind: "reading", kit, kits }))
          .catch((err) => console.warn("Could not open story", err))
      }
    />
  );
}
