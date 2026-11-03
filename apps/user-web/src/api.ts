import type { DetailLevel, ReadingLevel, Story, StoryPage } from "@socialstory/core";

export interface DraftView {
  id: string;
  story: Story;
  event: { title: string; startsAt: string };
  player: { name: string; readingLevel: ReadingLevel; detailLevel: DetailLevel };
  cast: Array<{ id: string; name: string; kind: "person" | "prop" }>;
  pictures: Record<string, number>;
  drawnFrom: Record<string, string>;
  /** On the child's shelf: when, and whether the shelf has exactly these words. */
  published?: { at: string; current: boolean };
}

export interface PublishResult {
  publishedAt: string;
  warnings: Array<{ page?: number; message: string }>;
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

const base = (id: string) => `/api/drafts/${encodeURIComponent(id)}`;

export const api = {
  list: () => call<string[]>("/api/drafts"),
  load: (id: string) => call<DraftView>(base(id)),
  save: (id: string, story: Story, origins: Array<number | null>) =>
    call<DraftView>(base(id), { method: "PUT", body: JSON.stringify({ story, origins }) }),
  keep: (id: string, page: number) => call<DraftView>(`${base(id)}/pages/${page}/keep`, { method: "POST" }),
  rewrite: (id: string, story: Story, page: number, note: string) =>
    call<StoryPage>(`${base(id)}/pages/${page}/rewrite`, { method: "POST", body: JSON.stringify({ story, note }) }),
  regenerate: (id: string, care: boolean) =>
    call<DraftView>(`${base(id)}/regenerate`, { method: "POST", body: JSON.stringify({ care }) }),
  publish: (id: string) => call<PublishResult>(`${base(id)}/publish`, { method: "POST" }),
  imageUrl: (id: string, file: string, version?: number) =>
    `${base(id)}/images/${file}${version ? `?v=${version}` : ""}`,
};
