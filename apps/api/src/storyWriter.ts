import {
  castFor,
  buildRevisionPrompt,
  buildStoryPrompt,
  draftToStory,
  StoryDraft,
  validateStory,
  type PlayerProfile,
  type Event,
  type Issue,
  type Story,
  type StoryPrompt,
  type ValidationResult,
} from "@socialstory/core";
import type { StructuredResult, Usage } from "./meta.js";

/**
 * The story writer: write -> validate -> revise, up to a limit.
 *
 * The model writes, but plain code (the validator in core) judges.
 * A story that fails goes back to the model with the exact problems.
 * After `maxRevisions` failed fixes we stop and report what's still
 * wrong rather than looping and spending credits forever.
 */

export const DEFAULT_MAX_REVISIONS = 2;

/** One call to the model. Swappable so tests can run without Meta. */
export type GenerateDraft = (
  kind: "write" | "revise",
  prompt: StoryPrompt,
) => Promise<StructuredResult<StoryDraft>>;

export interface Attempt {
  kind: "write" | "revise";
  usage: Usage;
  ok: boolean;
  /** Errors and warnings the validator found in this attempt. */
  issues: Issue[];
}

export interface WriteStoryResult {
  /** The last story produced (passing or not). */
  story: Story;
  validation: ValidationResult;
  attempts: Attempt[];
  totalUsage: Usage;
}

export type ProgressMessage = (message: string) => void;

function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    reasoningTokens: a.reasoningTokens + b.reasoningTokens,
  };
}

/** Turns a draft into a Story, or reports why it couldn't (e.g. fewer than 3 pages). */
function toStoryOrIssue(draft: StoryDraft): { story: Story } | { issue: Issue } {
  try {
    return { story: draftToStory(draft) };
  } catch (err) {
    return {
      issue: {
        severity: "error",
        code: "bad-shape",
        message: `Story shape is invalid: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }
}

export async function writeStory(
  event: Event,
  player: PlayerProfile,
  generate: GenerateDraft,
  options: { maxRevisions?: number; onProgress?: ProgressMessage } = {},
): Promise<WriteStoryResult> {
  const maxRevisions = options.maxRevisions ?? DEFAULT_MAX_REVISIONS;
  const castIds = castFor(event, player).map((m) => m.id);
  const progress = options.onProgress ?? (() => {});
  const attempts: Attempt[] = [];
  let totalUsage: Usage = { inputTokens: 0, outputTokens: 0, reasoningTokens: 0 };

  let kind: Attempt["kind"] = "write";
  let prompt = buildStoryPrompt(event, player);
  let lastStory: Story | undefined;
  let lastValidation: ValidationResult | undefined;

  for (let round = 0; round <= maxRevisions; round++) {
    progress(kind === "write" ? "Writing the story" : `Fixing the story (try ${round} of ${maxRevisions})`);
    const { data: draft, usage } = await generate(kind, prompt);
    totalUsage = addUsage(totalUsage, usage);

    progress("Checking it against the story guidelines");
    const converted = toStoryOrIssue(draft);
    let validation: ValidationResult;
    if ("issue" in converted) {
      validation = {
        ok: false,
        issues: [converted.issue],
        stats: { describing: 0, coaching: 0, ratio: 0 },
      };
    } else {
      lastStory = converted.story;
      validation = validateStory(converted.story, { castIds });
    }
    lastValidation = validation;
    attempts.push({ kind, usage, ok: validation.ok, issues: validation.issues });

    if (validation.ok && lastStory) {
      progress("Story passed review");
      return { story: lastStory, validation, attempts, totalUsage };
    }
    if (round === maxRevisions) break;

    // Ask for a fix. If we never got a usable story, start over instead.
    if (lastStory) {
      kind = "revise";
      prompt = buildRevisionPrompt(event, player, lastStory, validation.issues);
    } else {
      kind = "write";
      prompt = buildStoryPrompt(event, player);
    }
  }

  if (!lastStory || !lastValidation) {
    throw new Error("The model never produced a usable story. See attempts for details.");
  }
  progress("Story still has problems after the revision limit");
  return { story: lastStory, validation: lastValidation, attempts, totalUsage };
}
