import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BudgetReached, createBudget } from "./budget.js";

describe("daily spending cap", () => {
  it("does nothing without a cap (local development)", () => {
    const b = createBudget({ dir: mkdtempSync(join(tmpdir(), "spend-")) });
    b.record(100, "writeStory");
    expect(() => b.check()).not.toThrow();
  });

  it("stops once today's spending reaches the cap, and starts again tomorrow", () => {
    let day = new Date("2026-11-03T12:00:00Z");
    const dir = mkdtempSync(join(tmpdir(), "spend-"));
    const b = createBudget({ cap: 1, dir, now: () => day });
    b.record(0.6, "writeStory");
    expect(() => b.check()).not.toThrow();
    b.record(0.5, "drawPage");
    expect(() => b.check()).toThrow(BudgetReached);
    // Survives a restart: a new budget reads the same file.
    expect(() => createBudget({ cap: 1, dir, now: () => day }).check()).toThrow(BudgetReached);
    day = new Date("2026-11-04T00:00:01Z");
    expect(() => b.check()).not.toThrow();
    expect(b.spentToday()).toBe(0);
  });
});
