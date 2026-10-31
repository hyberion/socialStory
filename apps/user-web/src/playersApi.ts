import type { PlayerProfile } from "@socialstory/core";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

export const players = {
  list: () => call<PlayerProfile[]>("/api/players"),
  load: (id: string) => call<PlayerProfile>(`/api/players/${encodeURIComponent(id)}`),
  create: (p: Omit<PlayerProfile, "id">) => call<PlayerProfile>("/api/players", { method: "POST", body: JSON.stringify(p) }),
  save: (id: string, p: Omit<PlayerProfile, "id">) =>
    call<PlayerProfile>(`/api/players/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(p) }),
};
