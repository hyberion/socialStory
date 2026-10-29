import { useEffect, useState } from "react";
import { samplePlayer, sampleStory } from "@socialstory/core";

/**
 * The player-facing story reader. Rules it follows (see AGENTS.md):
 * - same layout on every page, big targets, no menus or settings
 * - nothing plays on its own; narration only when the player taps it
 * - no scores, streaks, timers or penalties; back and replay always work
 */
export function StoryViewer() {
  const story = sampleStory;
  const { sensory } = samplePlayer;
  const [index, setIndex] = useState(0);
  const page = story.pages[index]!;
  const isFirst = index === 0;
  const isLast = index === story.pages.length - 1;

  const canSpeak = sensory.soundEnabled && "speechSynthesis" in window;

  // Stop any narration when the page changes or the reader closes.
  useEffect(() => () => window.speechSynthesis?.cancel(), [index]);

  function readAloud() {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(page.sentences.map((s) => s.text).join(" "));
    utterance.rate = sensory.narrationRate;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className="reader">
      <h1 className="title">{story.title}</h1>

      <section className="page" aria-live="polite">
        <div className="picture" aria-hidden="true" />
        <div className="words">
          {page.sentences.map((s, i) => (
            <p key={i}>{s.text}</p>
          ))}
        </div>
      </section>

      <nav className="controls">
        <button className="nav" onClick={() => setIndex(index - 1)} disabled={isFirst} aria-label="Back">
          ←
        </button>

        <div className="dots" aria-label={`Page ${index + 1} of ${story.pages.length}`}>
          {story.pages.map((_, i) => (
            <span key={i} className={i === index ? "dot on" : "dot"} />
          ))}
        </div>

        {canSpeak && (
          <button className="nav" onClick={readAloud} aria-label="Read this page to me">
            🔈
          </button>
        )}

        <button
          className="nav"
          onClick={() => setIndex(isLast ? 0 : index + 1)}
          aria-label={isLast ? "Start again" : "Next"}
        >
          {isLast ? "↺" : "→"}
        </button>
      </nav>
    </main>
  );
}
