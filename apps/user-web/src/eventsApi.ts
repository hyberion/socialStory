import type { Event, PhotoChecklist } from "@socialstory/core";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

/** "-05:00" for the browser's own time zone, so "Tuesday at 10" means 10 where the user is. */
export function localOffset(date = new Date()): string {
  const minutes = -date.getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** "Sunday, 2026-11-01": lets the listener work out "Tuesday". */
export function todayText(date = new Date()): string {
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `${date.toLocaleDateString("en-US", { weekday: "long" })}, ${iso}`;
}

const json = (body: unknown) => ({ method: "POST", body: JSON.stringify(body) });

export const events = {
  list: () => call<Event[]>("/api/events"),
  load: (id: string) => call<Event>(`/api/events/${encodeURIComponent(id)}`),
  build: (templateKey: string, playerId: string, draft: unknown) =>
    call<Event>("/api/events/build", json({ templateKey, playerId, draft, tzOffset: localOffset() })),
  create: (e: Event) => call<Event>("/api/events", json(e)),
  save: (e: Event) => call<Event>(`/api/events/${encodeURIComponent(e.id)}`, { method: "PUT", body: JSON.stringify(e) }),
  photos: (id: string) => call<PhotoChecklist>(`/api/events/${encodeURIComponent(id)}/photos`),
  write: (id: string) => call<{ id: string; ok: boolean }>(`/api/events/${encodeURIComponent(id)}/write`, { method: "POST" }),
};
