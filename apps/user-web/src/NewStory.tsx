import { useEffect, useState } from "react";
import {
  EVENT_TEMPLATES,
  OTHER_TEMPLATE_KEY,
  EMPTY_EVENT_DRAFT,
  summarizeEventDraft,
  type Event,
  type PlayerProfile,
} from "@socialstory/core";
import { players } from "./playersApi";
import { events, todayText } from "./eventsApi";
import { Interview } from "./Interview";

type Stage =
  | { kind: "pick" }
  | { kind: "interview"; child: PlayerProfile; templateKey: string }
  | { kind: "building" };

/**
 * Starting a new story: who it's for, what kind of event, then talk it
 * through (or skip straight to the outline). Ends on the outline screen.
 */
export function NewStory({ onOutline, onCancel }: { onOutline: (e: Event) => void; onCancel: () => void }) {
  const [kids, setKids] = useState<PlayerProfile[]>();
  const [childId, setChildId] = useState<string>();
  const [templateKey, setTemplateKey] = useState<string>();
  const [stage, setStage] = useState<Stage>({ kind: "pick" });
  const [error, setError] = useState<string>();

  useEffect(() => {
    players.list().then((k) => {
      setKids(k);
      if (k.length === 1) setChildId(k[0]!.id);
    });
  }, []);

  const child = kids?.find((k) => k.id === childId);

  async function toOutline(draft: unknown) {
    if (!child || !templateKey) return;
    setStage({ kind: "building" });
    try {
      onOutline(await events.build(templateKey, child.id, draft ?? EMPTY_EVENT_DRAFT));
    } catch (e) {
      setError((e as Error).message);
      setStage({ kind: "pick" });
    }
  }

  if (stage.kind === "interview") {
    const t = EVENT_TEMPLATES[stage.templateKey];
    return (
      <Interview
        title={t ? `${t.label} for ${stage.child.displayName}` : `Something coming up for ${stage.child.displayName}`}
        endpoint="/api/events/interview"
        extra={{ templateKey: stage.templateKey, playerId: stage.child.id, today: todayText() }}
        summarize={(d) => summarizeEventDraft((d as typeof EMPTY_EVENT_DRAFT | undefined) ?? EMPTY_EVENT_DRAFT)}
        usualSteps={t?.steps.filter((s) => s.how === "usually").map((s) => s.description)}
        finishText="That's everything for now. Next, check the outline: every step, person and place, all editable."
        finishLabel="See the outline"
        onFinish={(d) => void toOutline(d)}
        onCancel={() => setStage({ kind: "pick" })}
      />
    );
  }
  if (stage.kind === "building") return <main className="page"><p className="muted">Putting the outline together…</p></main>;

  const choices = [
    ...Object.entries(EVENT_TEMPLATES).map(([key, t]) => ({ key, label: t.label, summary: t.summary })),
    { key: OTHER_TEMPLATE_KEY, label: "Something else", summary: "Describe it from scratch, step by step." },
  ];

  return (
    <main className="page">
      <button className="link" onClick={onCancel}>← Back</button>
      <h1>New story</h1>
      <p className="muted">
        Start by planning it. You don't need photos yet: at the end you'll get a list of photos that would help, to gather
        whenever you can.
      </p>

      <section className="card form">
        <h2>Who is it for?</h2>
        <div className="chips">
          {kids?.map((k) => (
            <button key={k.id} className={k.id === childId ? "chip on" : "chip"} aria-pressed={k.id === childId} onClick={() => setChildId(k.id)}>
              {k.displayName}
            </button>
          ))}
        </div>
      </section>

      <section className="card form">
        <h2>What's coming up?</h2>
        <div className="template-grid">
          {choices.map((c) => (
            <button key={c.key} className={c.key === templateKey ? "template on" : "template"} aria-pressed={c.key === templateKey} onClick={() => setTemplateKey(c.key)}>
              <strong>{c.label}</strong>
              <span>{c.summary}</span>
            </button>
          ))}
        </div>
        {templateKey && templateKey !== OTHER_TEMPLATE_KEY && (
          <p className="muted">
            A starting point, not a promise: you'll see every usual step and can change, add or remove any of them.
          </p>
        )}
      </section>

      {error && <p className="note bad">{error}</p>}
      <div className="toolbar bottom">
        <button onClick={() => void toOutline(EMPTY_EVENT_DRAFT)} disabled={!child || !templateKey}>
          Skip to the outline
        </button>
        <button
          className="primary"
          disabled={!child || !templateKey}
          onClick={() => child && templateKey && setStage({ kind: "interview", child, templateKey })}
        >
          Talk it through
        </button>
      </div>
    </main>
  );
}
