import type { PlayerProfile } from "@socialstory/core";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

async function upload<T>(url: string, file: File): Promise<T> {
  const res = await fetch(url, { method: "POST", body: file, headers: { "Content-Type": file.type || "image/jpeg" } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

type PhotoResult = { player: PlayerProfile; cutout: "made" | "not-found" | "failed" };

export const players = {
  addPhoto: (id: string, file: File) => upload<PhotoResult>(`/api/players/${encodeURIComponent(id)}/photo`, file),
  removePhoto: (id: string) => call<{ player: PlayerProfile }>(`/api/players/${encodeURIComponent(id)}/photo`, { method: "DELETE" }),
  list: () => call<PlayerProfile[]>("/api/players"),
  load: (id: string) => call<PlayerProfile>(`/api/players/${encodeURIComponent(id)}`),
  create: (p: Omit<PlayerProfile, "id">) => call<PlayerProfile>("/api/players", { method: "POST", body: JSON.stringify(p) }),
  save: (id: string, p: Omit<PlayerProfile, "id">) =>
    call<PlayerProfile>(`/api/players/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(p) }),
};
