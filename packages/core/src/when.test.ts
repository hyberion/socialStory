import { describe, expect, it } from "vitest";
import { dateWords, daysInMonth, timeWords, wallClock } from "./when.js";

describe("when", () => {
  it("reads the event's own wall-clock time, not the device's", () => {
    const t = wallClock("2026-11-03T10:00:00-05:00")!;
    expect(t).toMatchObject({ year: 2026, month: 11, day: 3, hour: 10, minute: 0 });
    expect(dateWords(t)).toBe("Tuesday, November 3");
    expect(timeWords(t)).toBe("10:00 in the morning");
  });

  it("says times plainly", () => {
    const at = (iso: string) => timeWords(wallClock(iso)!);
    expect(at("2026-11-03T14:30:00Z")).toBe("2:30 in the afternoon");
    expect(at("2026-11-03T12:00:00Z")).toBe("12:00 noon");
    expect(at("2026-11-03T18:05:00Z")).toBe("6:05 in the evening");
    expect(at("2026-11-03T00:15:00Z")).toBe("12:15 in the morning");
  });

  it("knows month lengths", () => {
    expect(daysInMonth(2026, 11)).toBe(30);
    expect(daysInMonth(2028, 2)).toBe(29);
  });
});
