import { describe, expect, it } from "vitest";
import { samplePlayer, sampleEvent, sampleStory, type StoryDraft } from "@socialstory/core";
import { writeStory, type GenerateDraft } from "./storyWriter.js";

/** Turns a Story fixture into the draft shape the model returns. */
function asDraft(story = sampleStory): StoryDraft {
  return {
    title: story.title,
    answers: [...story.answers],
    pages: story.pages.map((p) => ({
      section: p.section,
      stepId: p.stepId ?? "",
      sceneBrief: p.sceneBrief ?? "",
      inPicture: [...p.inPicture],
      sentences: p.sentences.map((s) => ({ ...s })),
    })),
  };
}

const usage = { inputTokens: 10, outputTokens: 20, reasoningTokens: 5 };

/** A fake model that returns the given drafts in order and records what it was asked. */
function fakeModel(...drafts: StoryDraft[]) {
  const calls: Array<{ kind: string; input: string }> = [];
  const generate: GenerateDraft = async (kind, prompt) => {
    calls.push({ kind, input: prompt.input });
    const next = drafts.shift();
    if (!next) throw new Error("fake model ran out of drafts");
    return { data: next, usage };
  };
  return { generate, calls };
}

/** A draft that breaks principle 2 ("must") on its first page. */
function badDraft(): StoryDraft {
  const draft = asDraft();
  draft.pages[0]!.sentences[0] = { text: "I must sit still.", type: "descriptive" };
  return draft;
}

describe("writeStory", () => {
  it("returns on the first try when the story passes", async () => {
    const model = fakeModel(asDraft());
    const result = await writeStory(sampleEvent, samplePlayer, model.generate);
    expect(result.validation.ok).toBe(true);
    expect(result.attempts).toHaveLength(1);
    expect(model.calls[0]!.kind).toBe("write");
  });

  it("sends failing stories back with the specific problems", async () => {
    const model = fakeModel(badDraft(), asDraft());
    const result = await writeStory(sampleEvent, samplePlayer, model.generate);
    expect(result.validation.ok).toBe(true);
    expect(result.attempts.map((a) => a.kind)).toEqual(["write", "revise"]);
    expect(model.calls[1]!.input).toContain("I must sit still.");
    expect(model.calls[1]!.input).toContain("dictates behavior");
  });

  it("stops at the revision limit instead of looping forever", async () => {
    const model = fakeModel(badDraft(), badDraft(), badDraft(), badDraft());
    const result = await writeStory(sampleEvent, samplePlayer, model.generate, { maxRevisions: 2 });
    expect(result.validation.ok).toBe(false);
    expect(result.attempts).toHaveLength(3);
    expect(model.calls).toHaveLength(3);
  });

  it("adds up token usage across attempts", async () => {
    const model = fakeModel(badDraft(), asDraft());
    const result = await writeStory(sampleEvent, samplePlayer, model.generate);
    expect(result.totalUsage).toEqual({ inputTokens: 20, outputTokens: 40, reasoningTokens: 10 });
  });

  it("reports progress in plain language", async () => {
    const messages: string[] = [];
    const model = fakeModel(badDraft(), asDraft());
    await writeStory(sampleEvent, samplePlayer, model.generate, { onProgress: (m) => messages.push(m) });
    expect(messages).toEqual([
      "Writing the story",
      "Checking it against the story guidelines",
      "Fixing the story (try 1 of 2)",
      "Checking it against the story guidelines",
      "Story passed review",
    ]);
  });

  it("starts over when the model returns an unusable shape", async () => {
    const tooShort = asDraft();
    tooShort.pages = tooShort.pages.slice(0, 1);
    const model = fakeModel(tooShort, asDraft());
    const result = await writeStory(sampleEvent, samplePlayer, model.generate);
    expect(result.attempts[0]!.issues[0]!.code).toBe("bad-shape");
    expect(model.calls.map((c) => c.kind)).toEqual(["write", "write"]);
    expect(result.validation.ok).toBe(true);
  });
});
