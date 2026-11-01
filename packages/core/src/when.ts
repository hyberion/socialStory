/**
 * Dates and times for the player's calendar and clock, read from the
 * event's own wall-clock time ("2026-11-03T10:00:00-05:00" is 10:00 on
 * Nov 3 wherever the tablet is). Pure functions, so the player app and
 * tests share them.
 */
export interface WallClock {
  year: number;
  /** 1 to 12 */
  month: number;
  day: number;
  /** 0 to 23 */
  hour: number;
  minute: number;
  /** 0 = Sunday */
  weekday: number;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

export function wallClock(iso: string): WallClock | undefined {
  const m = ISO.exec(iso);
  if (!m) return undefined;
  const [year, month, day, hour, minute] = m.slice(1).map(Number) as [number, number, number, number, number];
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, hour, minute, weekday };
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Days in a month (month is 1 to 12). */
export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** "Tuesday, November 3" */
export function dateWords(t: WallClock): string {
  return `${WEEKDAYS[t.weekday]}, ${MONTHS[t.month - 1]} ${t.day}`;
}

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty"];
const numberWords = (n: number) => (n < 20 ? ONES[n]! : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`);
const ORDINAL: Record<string, string> = { one: "first", two: "second", three: "third", five: "fifth", eight: "eighth", nine: "ninth", twelve: "twelfth" };
const ordinalWords = (n: number) => {
  const w = numberWords(n);
  const last = w.split("-").pop()!;
  const ord = ORDINAL[last] ?? (last.endsWith("y") ? `${last.slice(0, -1)}ieth` : `${last}th`);
  return w.slice(0, w.length - last.length) + ord;
};

/** For the voice: "Tuesday, November third". */
export function spokenDate(t: WallClock): string {
  return `${WEEKDAYS[t.weekday]}, ${MONTHS[t.month - 1]} ${ordinalWords(t.day)}`;
}

/** For the voice: "ten o'clock in the morning", "two thirty in the afternoon", "twelve o'clock, noon". */
export function spokenTime(t: WallClock): string {
  if (t.hour === 12 && t.minute === 0) return "twelve o'clock, noon";
  const h12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const minutes = t.minute === 0 ? "o'clock" : t.minute < 10 ? `oh ${numberWords(t.minute)}` : numberWords(t.minute);
  const part = t.hour < 12 ? "in the morning" : t.hour < 17 ? "in the afternoon" : t.hour < 21 ? "in the evening" : "at night";
  return `${numberWords(h12)} ${minutes} ${part}`;
}

/** "10:00 in the morning", "2:30 in the afternoon", "12:00 noon". Literal, no "a.m." to decode. */
export function timeWords(t: WallClock): string {
  if (t.hour === 12 && t.minute === 0) return "12:00 noon";
  const h12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const clock = `${h12}:${String(t.minute).padStart(2, "0")}`;
  const part = t.hour < 12 ? "in the morning" : t.hour < 17 ? "in the afternoon" : t.hour < 21 ? "in the evening" : "at night";
  return `${clock} ${part}`;
}
