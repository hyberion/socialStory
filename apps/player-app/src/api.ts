import { PublishedKit, KitSummary } from "@socialstory/core";

/** The player app only reads published kits; it never writes anything. */
export async function fetchKits(): Promise<KitSummary[]> {
  const res = await fetch("/api/kits");
  if (!res.ok) throw new Error(`kits ${res.status}`);
  return KitSummary.array().parse(await res.json());
}

export async function fetchKit(id: string): Promise<PublishedKit> {
  const res = await fetch(`/api/kits/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`kit ${res.status}`);
  return PublishedKit.parse(await res.json());
}

export const kitFileUrl = (id: string, file: string) =>
  `/api/kits/${encodeURIComponent(id)}/${encodeURIComponent(file)}`;
