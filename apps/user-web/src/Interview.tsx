import { useEffect, useRef, useState } from "react";
import { EMPTY_PROFILE_DRAFT, profileFromDraft, summarizeProfileDraft, type PlayerProfile, type ProfileInterviewDraft } from "@socialstory/core";
import { MicButton, type MicHandle } from "./voice/MicButton";

interface Question {
  id: string;
  spoken: string;
  screen: string;
}

/** One point in the interview: what's known, what's been asked, and what to ask next. */
interface Step {
  draft: ProfileInterviewDraft;
  asked: string[];
  next: Question | null;
  progress: { number: number; total: number };
  /** The answer given to `next`, kept so Back can show it again. */
  answer?: string;
}

async function post(body: object): Promise<Step> {
  const res = await fetch("/api/interview/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`That answer didn't go through (${res.status}). Nothing is lost; try again.`);
  return (await res.json()) as Step;
}

// Per-browser preferences (safe if storage is unavailable).
const pref = {
  get: (k: string, fallback: boolean) => {
    try {
      const v = localStorage.getItem(k);
      return v === null ? fallback : v === "1";
    } catch {
      return fallback;
    }
  },
  set: (k: string, v: boolean) => {
    try {
      localStorage.setItem(k, v ? "1" : "0");
    } catch {
      /* not saved; fine */
    }
  },
};

/**
 * Setting up a child by talking it through: one question per screen.
 * Questions come from a fixed bank with pre-recorded audio (nothing about
 * the child goes to a voice service). Tap Talk, then Stop sends the answer;
 * hands-free mode opens the mic after each question and sends when you stop
 * talking. Everything is reviewed as a form before it's saved.
 */
export function Interview({ onReview, onCancel }: { onReview: (p: Omit<PlayerProfile, "id">) => void; onCancel: () => void }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string>();
  const [readAloud, setReadAloud] = useState(() => pref.get("interview.readAloud", true));
  const [handsFree, setHandsFree] = useState(() => pref.get("interview.handsFree", false));
  const mic = useRef<MicHandle>(null);
  const typedBefore = useRef("");
  const audio = useRef<HTMLAudioElement | null>(null);

  const step = steps.at(-1);
  const question = step?.next ?? null;

  useEffect(() => {
    post({}).then((s) => setSteps([s])).catch((e: Error) => setError(e.message));
    return () => stopSpeaking();
  }, []);

  // Read each new question aloud; in hands-free mode, open the mic when it's done.
  useEffect(() => {
    if (!question || thinking) return;
    if (!readAloud) {
      if (handsFree) mic.current?.start();
      return;
    }
    speak(question, () => {
      if (handsFree) mic.current?.start();
    });
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id, steps.length]);

  function stopSpeaking() {
    audio.current?.pause();
    audio.current = null;
    window.speechSynthesis?.cancel();
  }

  /** Plays the recorded clip; falls back to the device voice if there isn't one yet. */
  function speak(q: Question, then: () => void) {
    stopSpeaking();
    const clip = new Audio(`/voice/questions/${q.id}.mp3`);
    audio.current = clip;
    clip.onended = then;
    clip.onerror = () => {
      if (audio.current !== clip || !("speechSynthesis" in window)) return then();
      const u = new SpeechSynthesisUtterance(q.spoken);
      u.rate = 0.95;
      u.onend = then;
      window.speechSynthesis.speak(u);
    };
    clip.play().catch(() => clip.onerror?.(new Event("error")));
  }

  async function send(text: string, fromMic = false) {
    if (!step || !question || thinking) return;
    const clean = text.trim() || "Skip this one";
    stopSpeaking();
    // Typed, skipped or "I don't know" while the mic was open: drop that recording.
    if (!fromMic) mic.current?.cancel();
    setThinking(true);
    setError(undefined);
    try {
      const next = await post({ draft: step.draft, asked: step.asked, answer: { questionId: question.id, text: clean } });
      setSteps([...steps.slice(0, -1), { ...step, answer: clean }, next]);
      setAnswer("");
    } catch (e) {
      setAnswer(text);
      setError((e as Error).message);
    } finally {
      setThinking(false);
    }
  }

  function back() {
    if (steps.length < 2) return;
    stopSpeaking();
    mic.current?.cancel();
    const previous = steps.at(-2)!;
    setSteps(steps.slice(0, -1));
    setAnswer(previous.answer === "Skip this one" ? "" : previous.answer ?? "");
  }

  const review = () => {
    stopSpeaking();
    mic.current?.cancel();
    onReview(profileFromDraft(step?.draft ?? EMPTY_PROFILE_DRAFT));
  };
  const summary = step ? summarizeProfileDraft(step.draft) : [];

  return (
    <main className="page interview">
      <div className="interview-top">
        <button className="link" onClick={() => { stopSpeaking(); mic.current?.cancel(); onCancel(); }}>← Leave</button>
        {question && step && (
          <span className="muted">
            Question {step.progress.number} of about {step.progress.total}
          </span>
        )}
        <span className="spacer" />
        <label className="toggle">
          <input type="checkbox" checked={readAloud} onChange={(e) => { setReadAloud(e.target.checked); pref.set("interview.readAloud", e.target.checked); if (!e.target.checked) stopSpeaking(); }} />
          Read questions aloud
        </label>
        <label className="toggle">
          <input type="checkbox" checked={handsFree} onChange={(e) => { setHandsFree(e.target.checked); pref.set("interview.handsFree", e.target.checked); }} />
          Hands-free
        </label>
      </div>

      {!step && !error && <p className="muted">Getting ready…</p>}

      {question ? (
        <section className="card question-card" aria-live="polite">
          <p className="question">
            {question.screen}
            {readAloud && (
              <button className="icon hear" aria-label="Hear the question again" onClick={() => speak(question, () => {})}>🔊</button>
            )}
          </p>
          <textarea
            className="answer"
            rows={3}
            value={answer}
            placeholder="Talk or type your answer…"
            aria-label="Your answer"
            disabled={thinking}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(answer);
              }
            }}
          />
          <div className="answer-actions">
            <MicButton
              ref={mic}
              handsFree={handsFree}
              stopLabel="Stop and send"
              disabled={thinking}
              onStart={() => {
                stopSpeaking();
                typedBefore.current = answer.trim();
              }}
              onText={(spoken) => setAnswer([typedBefore.current, spoken].filter(Boolean).join(" "))}
              onDone={(spoken) => void send([typedBefore.current, spoken].filter(Boolean).join(" "), true)}
            />
            {answer.trim() && (
              <button className="primary" onClick={() => void send(answer)} disabled={thinking}>Send</button>
            )}
            <span className="spacer" />
            <button className="small" onClick={() => void send("I don't know")} disabled={thinking}>I don't know</button>
            <button className="small" onClick={() => void send("Skip this one")} disabled={thinking}>Skip</button>
          </div>
          {thinking && <p className="muted got-it">Got it…</p>}
          {error && <p className="note bad">{error}</p>}
        </section>
      ) : (
        step && (
          <section className="card question-card done">
            <p className="question">That's everything. Next, check the profile and change anything that's not quite right.</p>
            <button className="primary big" onClick={review}>Review the profile</button>
          </section>
        )
      )}

      <div className="interview-bottom">
        <button className="small" onClick={back} disabled={steps.length < 2 || thinking}>← Previous question</button>
        {question && steps.length > 1 && (
          <button className="small" onClick={review} disabled={thinking}>Stop here and review</button>
        )}
      </div>

      {summary.length > 0 && (
        <aside className="card so-far">
          <h2>So far</h2>
          <ul>{summary.map((s) => <li key={s}>{s}</li>)}</ul>
        </aside>
      )}
    </main>
  );
}
