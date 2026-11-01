import { useCallback, useEffect, useRef, useState } from "react";
import { splitWords, wordAt, wordKey, type KitNarration, type WordHelp } from "@socialstory/core";

/**
 * Plays a page's recording and says which word is being read. The recording
 * is fetched as a file first: then "Say it" can jump straight to one word,
 * and it works offline once the page has been opened.
 */
export function useReadAlong(url: string | undefined, narration: KitNarration | undefined, rate: number) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const stopAt = useRef<number | null>(null);
  const frame = useRef<number>(0);
  const [current, setCurrent] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!url || !narration) return;
    let objectUrl: string | undefined;
    let gone = false;
    setReady(false);
    fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then((blob) => {
        if (gone) return;
        objectUrl = URL.createObjectURL(blob);
        const a = new Audio(objectUrl);
        a.preload = "auto";
        a.playbackRate = rate;
        a.onended = () => {
          setPlaying(false);
          setCurrent(-1);
        };
        audio.current = a;
        setReady(true);
      })
      .catch(() => setReady(false)); // no recording: the page still reads with the device voice
    return () => {
      gone = true;
      cancelAnimationFrame(frame.current);
      audio.current?.pause();
      audio.current = null;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPlaying(false);
      setCurrent(-1);
    };
  }, [url, narration, rate]);

  // Follows the recording while it plays (smoother than the audio's own updates).
  const follow = useCallback(() => {
    const a = audio.current;
    if (!a || !narration) return;
    if (stopAt.current !== null && a.currentTime >= stopAt.current) {
      a.pause();
      stopAt.current = null;
      setPlaying(false);
      setCurrent(-1);
      return;
    }
    if (stopAt.current === null) setCurrent(wordAt(narration.words, a.currentTime));
    if (!a.paused) frame.current = requestAnimationFrame(follow);
  }, [narration]);

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    audio.current?.pause();
    stopAt.current = null;
    setPlaying(false);
    setCurrent(-1);
  }, []);

  /** Reads the whole page from the start. */
  const play = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    stopAt.current = null;
    a.currentTime = 0;
    void a.play().then(() => {
      setPlaying(true);
      frame.current = requestAnimationFrame(follow);
    });
  }, [follow]);

  /** Says one word, cut from the page's recording. */
  const sayWord = useCallback(
    (index: number) => {
      const a = audio.current;
      const w = narration?.words[index];
      if (!a || !w) return false;
      cancelAnimationFrame(frame.current);
      setCurrent(-1);
      a.currentTime = Math.max(0, w.start - 0.03);
      stopAt.current = w.end + 0.08;
      void a.play().then(() => {
        frame.current = requestAnimationFrame(follow);
      });
      return true;
    },
    [narration, follow],
  );

  return { ready, playing, current, play, stop, sayWord };
}

/**
 * The page's words, each one tappable. The word being read gets a calm,
 * steady highlight (no flashing or movement); words with help have a dotted
 * underline.
 */
export function PageWords({
  sentences,
  current,
  help,
  onWord,
}: {
  sentences: Array<{ text: string }>;
  current: number;
  help: WordHelp[];
  onWord: (index: number, word: string) => void;
}) {
  const helped = new Set(help.map((h) => h.word));
  let n = 0;
  return (
    <div className="words">
      {sentences.map((s, si) => (
        <p key={si}>
          {splitWords(s.text.trim()).map((word, wi) => {
            const index = n++;
            const cls = ["word", index === current ? "reading" : "", helped.has(wordKey(word)) ? "has-help" : ""].filter(Boolean).join(" ");
            return (
              <span key={wi}>
                {wi > 0 && " "}
                <button type="button" className={cls} onClick={() => onWord(index, word)}>
                  {word}
                </button>
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}

/**
 * One word, big, with "Say it" and its meaning, over the middle of the screen
 * so the player never has to scroll to find it (Nov 1). Closes only when the
 * player chooses: Done, or a tap outside the card.
 */
export function WordCard({
  word,
  means,
  canSay,
  onSay,
  onClose,
}: {
  word: string;
  means?: string;
  canSay: boolean;
  onSay: () => void;
  onClose: () => void;
}) {
  const shown = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  const done = useRef<HTMLButtonElement>(null);
  useEffect(() => done.current?.focus(), []);
  return (
    <div className="word-card-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="word-card" role="dialog" aria-modal="true" aria-label={`The word ${shown}`}>
      <p className="big-word">{shown}</p>
      {means && <p className="means">{means}</p>}
      <div className="word-card-buttons">
        {canSay && (
          <button className="choice" onClick={onSay}>
            🔈 Say it
          </button>
        )}
        <button className="choice" onClick={onClose} ref={done}>
          Done
        </button>
      </div>
    </div>
    </div>
  );
}
