import { useEffect, useState } from "react";
import type { PublishedKit } from "@socialstory/core";
import { pageSpeechText, wordKey } from "@socialstory/core";
import { kitFileUrl } from "./api";
import { TimeCard } from "./TimeCard";
import { PageWords, WordCard, useReadAlong } from "./ReadAlong";

/**
 * The player-facing story reader. Rules it follows (see AGENTS.md):
 * - same layout on every page, big targets, no menus or settings
 * - nothing plays on its own; narration only when the player taps it
 * - no scores, streaks, timers or penalties; back and replay always work
 * Sensory settings come from the kit, so they match what the user approved.
 */
export function StoryViewer({ kit, onHome }: { kit: PublishedKit; onHome?: () => void }) {
  const { sensory } = kit;
  const [index, setIndex] = useState(0);
  const page = kit.pages[index]!;
  const isFirst = index === 0;
  const isLast = index === kit.pages.length - 1;

  const narration = sensory.soundEnabled ? page.narration : undefined;
  const read = useReadAlong(narration ? kitFileUrl(kit.id, narration.audio) : undefined, narration, sensory.narrationRate);
  const deviceVoice = sensory.soundEnabled && "speechSynthesis" in window;
  const canSpeak = read.ready || deviceVoice;
  const [card, setCard] = useState<{ index: number; word: string }>();

  // Stop any reading and close the word card when the page changes or the reader closes.
  useEffect(() => {
    setCard(undefined);
    return () => window.speechSynthesis?.cancel();
  }, [index]);

  function readAloud() {
    if (read.ready) {
      if (read.playing) read.stop();
      else read.play();
      return;
    }
    if (!deviceVoice) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(pageSpeechText(page, page.when));
    utterance.rate = sensory.narrationRate;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className="reader">
      <header className="top">
        {onHome ? (
          <button className="nav small" onClick={onHome} aria-label="All my stories">
            ⌂
          </button>
        ) : (
          <span />
        )}
        <h1 className="title">{kit.title}</h1>
        <span />
      </header>

      <section className="page" aria-live="polite">
        <div className={page.when ? "lead with-time" : "lead"}>
          {page.image ? (
            <img className="picture" src={kitFileUrl(kit.id, page.image)} alt={page.imageAlt ?? ""} />
          ) : (
            <div className="picture" aria-hidden="true" />
          )}
          {page.when && <TimeCard when={page.when} />}
        </div>
        <PageWords
          sentences={page.sentences}
          current={read.current}
          help={page.narration?.help ?? []}
          onWord={(i, word) => {
            read.stop();
            setCard({ index: i, word });
          }}
        />
        {card && (
          <WordCard
            word={card.word}
            means={page.narration?.help.find((h) => h.word === wordKey(card.word))?.means}
            canSay={read.ready || deviceVoice}
            onSay={() => {
              if (!read.sayWord(card.index) && deviceVoice) {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(card.word);
                u.rate = sensory.narrationRate;
                window.speechSynthesis.speak(u);
              }
            }}
            onClose={() => setCard(undefined)}
          />
        )}
      </section>

      <nav className="controls">
        <button className="nav" onClick={() => setIndex(index - 1)} disabled={isFirst} aria-label="Back">
          ←
        </button>

        <div className="dots" aria-label={`Page ${index + 1} of ${kit.pages.length}`}>
          {kit.pages.map((_, i) => (
            <span key={i} className={i === index ? "dot on" : "dot"} />
          ))}
        </div>

        {canSpeak && (
          <button
            className={read.playing ? "nav on" : "nav"}
            onClick={readAloud}
            aria-label={read.playing ? "Stop reading" : "Read this page to me"}
          >
            {read.playing ? "■" : "🔈"}
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
