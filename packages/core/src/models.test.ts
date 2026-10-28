import { describe, expect, it } from "vitest";
import { MODEL_IDS, estimateCost, formatDollars, isReasoningEffort } from "./models.js";

describe("estimateCost", () => {
  it("prices the first real doctor story at about 3 cents", () => {
    const cost = estimateCost(MODEL_IDS.spark, { inputTokens: 1016, outputTokens: 7021 });
    expect(cost).toBeCloseTo(0.0311, 3);
    expect(formatDollars(cost)).toBe("$0.031");
  });
});

describe("isReasoningEffort", () => {
  it("accepts Meta's values and rejects others", () => {
    expect(isReasoningEffort("medium")).toBe(true);
    expect(isReasoningEffort("none")).toBe(false);
  });
});
