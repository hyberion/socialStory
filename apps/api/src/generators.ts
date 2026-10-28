import { StoryDraft } from "@socialstory/core";
import { runStructuredTask } from "./meta.js";
import type { GenerateDraft } from "./storyWriter.js";

/**
 * The real story generator, backed by Muse Spark. Kept apart from
 * storyWriter.ts so tests can exercise the loop without a Meta key.
 */
export const metaDraftGenerator: GenerateDraft = (kind, prompt) =>
  runStructuredTask(
    kind === "write" ? "writeStory" : "reviseStory",
    StoryDraft,
    "social_story",
    prompt.input,
    { instructions: prompt.instructions },
  );
