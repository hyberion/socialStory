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
  /** The user's voice notes or form -> structured Event. */
  extractEvent: {
    model: MODEL_IDS.spark,
    effort: "low",
    note: "Structured extraction; little reasoning needed.",
  },
  /** Event + profile -> Social Story script. The core creative task. */
  writeStory: {
    model: MODEL_IDS.spark,
    effort: "low",
    note: "Low passed Gray criteria on the first try at 40% of high's cost (Oct 28 test); validator and revise loop catch misses.",
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

/** Settings for Muse Image calls. Every image costs the same; "low" only makes it faster. */
export interface ImageTask {
  model: string;
  /**
   * Image shape. The Responses API image tool rejected free-form sizes
   * ("unknown value 768x1024", Oct 28), so use only these values.
   */
  size: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  reasoningStrength: "low" | "high";
  note: string;
}

export const IMAGE_TASKS = {
  /** Character reference portraits: everything else is drawn to match these, so take care. */
  castPortrait: {
    model: MODEL_IDS.image,
    size: "1024x1536",
    reasoningStrength: "high",
    note: "Anchors every later picture; worth the extra time.",
  },
  /** One story page, drawn from the cast portraits. */
  page: {
    model: MODEL_IDS.image,
    size: "1536x1024",
    reasoningStrength: "high",
    note: "Start at high; try low with a side-by-side comparison before switching.",
  },
} as const satisfies Record<string, ImageTask>;

export type ImageTaskName = keyof typeof IMAGE_TASKS;

export const REASONING_EFFORTS: readonly ReasoningEffort[] = [
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

export function isReasoningEffort(value: string): value is ReasoningEffort {
  return (REASONING_EFFORTS as readonly string[]).includes(value);
}

/**
 * Standard-mode prices in US dollars per 1M tokens, from
 * https://dev.meta.ai/docs/pricing-rate-limits (checked Oct 28, 2026).
 * Reasoning tokens are counted inside output tokens.
 *
 * We deliberately do NOT use "contributor mode" (the -contributor
 * models): it is much cheaper but lets Meta train on prompts and
 * responses, which would include families' details.
 */
export const PRICES = {
  [MODEL_IDS.spark]: { input: 1.25, cachedInput: 0.15, output: 4.25 },
} as const;

/** Dollars per generated image (Muse Image). */
export const IMAGE_PRICE = 0.01;

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Estimated cost in US dollars. Ignores the cached-input discount, so it errs high. */
export function estimateCost(model: keyof typeof PRICES, usage: TokenUsage): number {
  const price = PRICES[model];
  return (usage.inputTokens * price.input + usage.outputTokens * price.output) / 1_000_000;
}

export function formatDollars(amount: number): string {
  return amount < 0.01 ? `$${amount.toFixed(4)}` : `$${amount.toFixed(3)}`;
}
