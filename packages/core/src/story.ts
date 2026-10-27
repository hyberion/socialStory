import { z } from "zod";

/**
 * Story structure follows Carol Gray's Social Story criteria:
 * a title, an introduction, a body, and a conclusion, built from
 * tagged sentence types so the validator can check the formula.
 */

export const SentenceType = z.enum([
  /** Facts: "The waiting room has a fish tank." */
  "descriptive",
  /** Thoughts or feelings of others or self: "Many kids feel nervous at the doctor." */
  "perspective",
  /** Common shared values: "That is okay." */
  "affirmative",
  /** Gentle suggestions or options: "I can hold Bear while I wait." */
  "coaching",
]);
export type SentenceType = z.infer<typeof SentenceType>;

/** Types that count as "describing" in Gray's formula. */
export const DESCRIBING_TYPES: readonly SentenceType[] = [
  "descriptive",
  "perspective",
  "affirmative",
];

export const Sentence = z.object({
  text: z.string().min(1),
  type: SentenceType,
});
export type Sentence = z.infer<typeof Sentence>;

export const StorySection = z.enum(["introduction", "body", "conclusion"]);
export type StorySection = z.infer<typeof StorySection>;

export const StoryPage = z.object({
  section: StorySection,
  sentences: z.array(Sentence).min(1),
  /** Event step this page illustrates, if any. */
  stepId: z.string().optional(),
  /** Brief for the illustrator: what this page's picture shows. */
  sceneBrief: z.string().optional(),
});
export type StoryPage = z.infer<typeof StoryPage>;

export const WhQuestion = z.enum(["who", "what", "when", "where", "why", "how"]);
export type WhQuestion = z.infer<typeof WhQuestion>;

export const Story = z.object({
  title: z.string().min(1),
  pages: z.array(StoryPage).min(3),
  /** Which WH questions the writer claims the story answers. Validator checks all six. */
  answers: z.array(WhQuestion).default([]),
});
export type Story = z.infer<typeof Story>;
