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

import { pageFingerprint, pictureOutOfDate } from "./kit.js";

describe("pictureOutOfDate (Oct 30: added words flagged every picture)", () => {
  const page = { sentences: [{ text: "We wait." }], sceneBrief: "Sam waits by the fish tank.", inPicture: ["player"] };
  const drawn = pageFingerprint(page);
  it("ignores word changes when the picture description is the same", () => {
    expect(pictureOutOfDate(drawn, { ...page, sentences: [{ text: "We wait." }, { text: "She is a new person to me." }] })).toBe(false);
  });
  it("flags a changed description or cast", () => {
    expect(pictureOutOfDate(drawn, { ...page, sceneBrief: "Sam waits outside." })).toBe(true);
    expect(pictureOutOfDate(drawn, { ...page, inPicture: ["player", "c-dad"] })).toBe(true);
  });
  it("doesn't guess about old-format fingerprints", () => {
    expect(pictureOutOfDate("1a60ea38", page)).toBe(false);
  });
});
