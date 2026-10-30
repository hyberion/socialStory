import type { Sentence, SentenceType, Story, StoryPage, StorySection } from "@socialstory/core";

/**
 * The editor's working copy. Every sentence and page gets a stable key so
 * drag-and-drop can track it, and every page remembers which saved page it
 * came from (`origin`), so its picture can follow it when pages move.
 */
export interface EditSentence extends Sentence {
  key: string;
}

export interface EditPage {
  key: string;
  /** Index of this page in the story as last saved, or null if it's new. */
  origin: number | null;
  section: StorySection;
  stepId?: string;
  sceneBrief?: string;
  inPicture: string[];
  sentences: EditSentence[];
}

export interface EditStory {
  title: string;
  answers: Story["answers"];
  pages: EditPage[];
}

let counter = 0;
export const newKey = (prefix: string) => `${prefix}-${++counter}`;

export function toEdit(story: Story): EditStory {
  return {
    title: story.title,
    answers: story.answers,
    pages: story.pages.map((p, i) => fromPage(p, i)),
  };
}

export function fromPage(p: StoryPage, origin: number | null): EditPage {
  return {
    key: newKey("page"),
    origin,
    section: p.section,
    stepId: p.stepId,
    sceneBrief: p.sceneBrief,
    inPicture: [...p.inPicture],
    sentences: p.sentences.map((s) => ({ ...s, key: newKey("s") })),
  };
}

export function toPage(p: EditPage): StoryPage {
  return {
    section: p.section,
    stepId: p.stepId,
    sceneBrief: p.sceneBrief?.trim() ? p.sceneBrief : undefined,
    inPicture: p.inPicture,
    sentences: p.sentences.map(({ text, type }) => ({ text, type })),
  };
}

/** The story as the server and checker see it. Blank sentences are left out. */
export function toStory(s: EditStory): Story {
  return {
    title: s.title,
    answers: s.answers,
    pages: s.pages.map((p) => toPage({ ...p, sentences: p.sentences.filter((x) => x.text.trim()) })),
  };
}

/** Plain names for the four sentence types. */
export const TYPE_LABELS: Record<SentenceType, string> = {
  descriptive: "What happens",
  perspective: "Feelings",
  affirmative: "It's okay",
  coaching: "A choice",
};

export const TYPE_HELP: Record<SentenceType, string> = {
  descriptive: "Facts: what happens, and how it looks, sounds and feels.",
  perspective: "What people may think or feel.",
  affirmative: "A calm shared value, like \"That is okay.\"",
  coaching: "An option your child can choose. Keep these few: about one for every two of the others.",
};
