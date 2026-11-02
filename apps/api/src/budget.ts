import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The public demo's daily spending cap. Every paid AI call checks it first
 * and records what it cost afterwards (an estimate: token prices for Spark,
 * a fixed amount per picture, cutout or voice session). Once today's total
 * reaches the cap, calls stop with a plain message until tomorrow (UTC).
 * Kept in .data/spend/<date>.json so a restart doesn't reset it.
 *
 * With no cap set (local development) nothing is checked or written.
 */

export class BudgetReached extends Error {
  constructor() {
    super("Today's demo budget has been used up, so the app can't make anything new until tomorrow. Finished stories still work.");
    this.name = "BudgetReached";
  }
}

export interface Budget {
  /** Throws BudgetReached when today's spending has reached the cap. */
  check(): void;
  record(dollars: number, what: string): void;
  spentToday(): number;
}

export function createBudget(options: { cap?: number; dir: string; now?: () => Date }): Budget {
  const { cap, dir } = options;
  const now = options.now ?? (() => new Date());
  if (!cap) return { check() {}, record() {}, spentToday: () => 0 };

  const fileFor = () => resolve(dir, `${now().toISOString().slice(0, 10)}.json`);
  const read = (): { total: number; calls: Record<string, number> } => {
    const file = fileFor();
    if (!existsSync(file)) return { total: 0, calls: {} };
    try {
      return JSON.parse(readFileSync(file, "utf8"));
    } catch {
      return { total: 0, calls: {} };
    }
  };

  return {
    check() {
      if (read().total >= cap) throw new BudgetReached();
    },
    record(dollars, what) {
      if (!(dollars > 0)) return;
      mkdirSync(dir, { recursive: true });
      const day = read();
      day.total = Math.round((day.total + dollars) * 1e6) / 1e6;
      day.calls[what] = (day.calls[what] ?? 0) + 1;
      writeFileSync(fileFor(), JSON.stringify(day, null, 2));
    },
    spentToday: () => read().total,
  };
}

/** Rough per-call prices where Meta bills per item rather than per token (estimates, on the high side). */
export const FLAT_PRICES = {
  /** One SAM 3.1 cutout. */
  segment: 0.01,
  /** One voice-input session (a spoken answer is under a minute). */
  voice: 0.01,
} as const;
