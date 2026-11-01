import { useEffect, useRef, useState } from "react";
import {
  EMPTY_PROFILE_DRAFT,
  profileFromDraft,
  summarizeProfileDraft,
  type InterviewTurn,
  type PlayerProfile,
  type ProfileInterviewDraft,
} from "@socialstory/core";
import { MicButton } from "./voice/MicButton";

interface Step {
  draft: ProfileInterviewDraft;
  nextQuestion: string;
  done: boolean;
}

async function ask(draft: ProfileInterviewDraft, turns: InterviewTurn[]): Promise<Step> {
  const res = await fetch("/api/interview/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft, turns }),
  });
  if (!res.ok) throw new Error(`The interview couldn't continue (${res.status}). Your answers so far are kept; try again.`);
  return (await res.json()) as Step;
}

/**
 * Setting up a child by talking it through: one question at a time, any
 * answer can be "I don't know", and everything is reviewed as a form
 * before it's saved.
 */
export function Interview({ onReview, onCancel }: { onReview: (p: Omit<PlayerProfile, "id">) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<ProfileInterviewDraft>(EMPTY_PROFILE_DRAFT);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [question, setQuestion] = useState<string>();
  const [done, setDone] = useState(false);
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string>();
  const bottom = useRef<HTMLDivElement>(null);
  // Text typed before talking; spoken words are added after it.
  const typedBefore = useRef("");

  useEffect(() => {
    void ask(EMPTY_PROFILE_DRAFT, []).then((s) => setQuestion(s.nextQuestion)).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, question, thinking]);

  async function send(text: string) {
    if (!question || !text.trim() || thinking) return;
    const next = [...turns, { question, answer: text.trim() }];
    setTurns(next);
    setAnswer("");
    setThinking(true);
    setError(undefined);
    try {
      const step = await ask(draft, next);
      setDraft(step.draft);
      setQuestion(step.nextQuestion);
      setDone(step.done);
    } catch (e) {
      setTurns(turns); // put the answer back so nothing is lost
      setAnswer(text);
      setError((e as Error).message);
    } finally {
      setThinking(false);
    }
  }

  const summary = summarizeProfileDraft(draft);

  return (
    <main className="page wide interview">
      <button className="link" onClick={onCancel}>← Back</button>
      <h1>Tell us about your child</h1>
      <p className="muted">
        One question at a time. "I don't know" and "skip" are always fine, and you'll check everything before it's saved. We
        never ask for a diagnosis.
      </p>

      <div className="interview-grid">
        <section className="chat" aria-live="polite">
          {turns.map((t, i) => (
            <div key={i} className="turn">
              <p className="bubble q">{t.question}</p>
              <p className="bubble a">{t.answer}</p>
            </div>
          ))}
          {question && <p className="bubble q">{question}</p>}
          {thinking && <p className="bubble q thinking">…</p>}
          <div ref={bottom} />

          {done ? (
            <div className="answer-row">
              <button className="primary" onClick={() => onReview(profileFromDraft(draft))}>Review the profile</button>
            </div>
          ) : (
            <>
              <div className="answer-row">
                <textarea
                  rows={2}
                  value={answer}
                  placeholder="Type your answer…"
                  aria-label="Your answer"
                  disabled={!question || thinking}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(answer);
                    }
                  }}
                />
                <button className="primary" onClick={() => send(answer)} disabled={!answer.trim() || thinking}>Send</button>
              </div>
              <MicButton
                disabled={!question || thinking}
                onStart={() => {
                  typedBefore.current = answer.trim();
                }}
                onText={(spoken) => setAnswer([typedBefore.current, spoken].filter(Boolean).join(" "))}
                onDone={(spoken) => setAnswer([typedBefore.current, spoken].filter(Boolean).join(" "))}
              />
              <div className="quick">
                <button className="small" onClick={() => send("I don't know")} disabled={thinking || !question}>I don't know</button>
                <button className="small" onClick={() => send("Skip this one")} disabled={thinking || !question}>Skip</button>
                {turns.length > 0 && (
                  <button className="small" onClick={() => onReview(profileFromDraft(draft))} disabled={thinking}>
                    Stop here and review
                  </button>
                )}
              </div>
            </>
          )}
          {error && <p className="note bad">{error}</p>}
        </section>

        <aside className="card so-far">
          <h2>So far</h2>
          {summary.length ? <ul>{summary.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="muted">Nothing yet.</p>}
        </aside>
      </div>
    </main>
  );
}
