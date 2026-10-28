import { StoryDraft, type ReasoningEffort } from "@socialstory/core";
import { runStructuredTask } from "./meta.js";
import type { GenerateDraft } from "./storyWriter.js";

/**
 * The real story generator, backed by Muse Spark. Kept apart from
 * storyWriter.ts so tests can exercise the loop without a Meta key.
 *
 * `effort` overrides the reasoning level for both writing and revising;
 * leave it out to use the defaults in packages/core/src/models.ts.
 */
export function makeMetaDraftGenerator(options: { effort?: ReasoningEffort } = {}): GenerateDraft {
  return (kind, prompt) =>
    runStructuredTask(
      kind === "write" ? "writeStory" : "reviseStory",
      StoryDraft,
      "social_story",
      prompt.input,
      { instructions: prompt.instructions, effort: options.effort },
    );
}

export const metaDraftGenerator = makeMetaDraftGenerator();
