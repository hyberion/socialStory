import { describe, expect, it } from "vitest";
import { samplePlayer, sampleEvent } from "./fixtures.js";
import { buildStoryPrompt } from "./prompts.js";

describe("buildStoryPrompt", () => {
  it("tells the model who is coming with the child", () => {
    const { input } = buildStoryPrompt(sampleEvent, samplePlayer);
    expect(input).toContain("Coming with the child: Dad (parent)");
  });

  it("says so when nobody is listed, so the model doesn't invent family", () => {
    const { input, instructions } = buildStoryPrompt({ ...sampleEvent, companions: [] }, samplePlayer);
    expect(input).toContain("Coming with the child: not given");
    expect(instructions).toContain('do not say "we"');
  });

  it("marks fixed steps so the model is honest about them", () => {
    const { input } = buildStoryPrompt(sampleEvent, samplePlayer);
    expect(input).toContain("Dr. Patel gives me a shot. [at the exam room] [with Dr. Patel] (FIXED)");
  });

  it("keeps the rules that past runs taught us", () => {
    const { instructions } = buildStoryPrompt(sampleEvent, samplePlayer);
    // Oct 28: a story invented trains from the child's interests.
    expect(instructions).toContain("The event never mentions trains");
    // Oct 28: every conclusion repeated "go home" from the last page.
    expect(instructions).toContain('must not say "go home" again');
    // Oct 28: a picture brief called a noisy room quiet.
    expect(instructions).toContain("The picture must match that page's text");
  });

  it("adapts to the child's reading level", () => {
    const pre = buildStoryPrompt(sampleEvent, { ...samplePlayer, readingLevel: "pre-verbal" });
    const reader = buildStoryPrompt(sampleEvent, { ...samplePlayer, readingLevel: "reader" });
    expect(pre.instructions).toContain("does not read yet");
    expect(reader.instructions).toContain("reads well");
  });
});
