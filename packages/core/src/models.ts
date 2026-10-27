/**
 * Single place that decides which Meta model and how much reasoning
 * each task gets. Reasoning tokens are billed, so simple tasks run low.
 * Change models here, never inline in app code.
 */

export const MODEL_IDS = {
  spark: "muse-spark-1.3",
  image: "muse-image-1.0",
  segment: "sam-3.1",
  transcribe: "muse-voice-transcribe-1.0",
} as const;

/** Values Muse Spark 1.3 accepts. "none" is not supported (HTTP 400). */
export type ReasoningEffort = "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export interface TextTask {
  model: string;
  effort: ReasoningEffort;
  /** Why this setting, for whoever tunes it later. */
  note: string;
}

export const TEXT_TASKS = {
  /** Parent's voice notes or form -> structured Event. */
  extractEvent: {
    model: MODEL_IDS.spark,
    effort: "low",
    note: "Structured extraction; little reasoning needed.",
  },
  /** Event + profile -> Social Story script. The core creative task. */
  writeStory: {
    model: MODEL_IDS.spark,
    effort: "high",
    note: "Must satisfy Gray criteria and tone rules; worth the reasoning.",
  },
  /** Rewrite a story that failed validation, given the issues. */
  reviseStory: {
    model: MODEL_IDS.spark,
    effort: "medium",
    note: "Targeted fixes against a known issue list.",
  },
  /** Story pages -> image briefs and game definitions. */
  planKit: {
    model: MODEL_IDS.spark,
    effort: "medium",
    note: "Turns approved script into scene briefs and game specs.",
  },
  /** Tiny health check. */
  smoke: {
    model: MODEL_IDS.spark,
    effort: "minimal",
    note: "Connectivity check only.",
  },
} as const satisfies Record<string, TextTask>;

export type TextTaskName = keyof typeof TEXT_TASKS;
