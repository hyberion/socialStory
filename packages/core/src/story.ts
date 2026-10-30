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
  /** Cast ids of everyone shown in the picture (see castFor). Empty = a place or object only. */
  inPicture: z.array(z.string()).default([]),
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

/**
 * The shape the model is asked to return. Meta's strict JSON mode needs
 * every field present (no optional fields, no defaults, no min/max), so
 * "not set" is an empty string here (nulls are not reliably supported).
 * `draftToStory` converts a draft into a real Story, which applies the
 * full Story rules.
 */
export const StoryDraft = z.object({
  title: z.string(),
  answers: z.array(WhQuestion),
  pages: z.array(
    z.object({
      section: StorySection,
      stepId: z.string(),
      sceneBrief: z.string(),
      inPicture: z.array(z.string()),
      sentences: z.array(Sentence),
    }),
  ),
});
export type StoryDraft = z.infer<typeof StoryDraft>;

/** One page, in the strict shape the model returns ("Rewrite this page"). */
export const PageDraft = z.object({
  section: StorySection,
  stepId: z.string(),
  sceneBrief: z.string(),
  inPicture: z.array(z.string()),
  sentences: z.array(Sentence),
});
export type PageDraft = z.infer<typeof PageDraft>;

export function draftToPage(draft: PageDraft): StoryPage {
  return StoryPage.parse({
    section: draft.section,
    sentences: draft.sentences,
    sceneBrief: draft.sceneBrief || undefined,
    inPicture: draft.inPicture,
    stepId: draft.stepId || undefined,
  });
}

export function draftToStory(draft: StoryDraft): Story {
  return Story.parse({
    title: draft.title,
    answers: draft.answers,
    pages: draft.pages.map((p) => ({
      section: p.section,
      sentences: p.sentences,
      sceneBrief: p.sceneBrief || undefined,
      inPicture: p.inPicture,
      stepId: p.stepId || undefined,
    })),
  });
}
