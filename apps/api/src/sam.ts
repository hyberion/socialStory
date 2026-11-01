import sharp from "sharp";

/**
 * SAM 3.1: cut a person or object out of a user's photo.
 *
 * The request is a Responses API call with the photo and a short noun phrase
 * ("person", "stuffed bunny"). SAM streams back boxes and masks; Meta's
 * official @meta-sam/parser decodes each mask into a 0/1 grid that covers
 * its box. A cutout is the photo cropped to that box, with the grid as its
 * see-through layer.
 */

export interface FoundObject {
  /** Half-open pixel box in the photo the mask covers. */
  bounds: { left: number; top: number; right: number; bottom: number };
  /** Row-major 0/1 values, (right-left) x (bottom-top). */
  raster: Uint8Array;
  confidence?: number;
}

export type Segmenter = (photo: Buffer, phrase: string) => Promise<FoundObject | undefined>;

/** Photos are straightened (phone rotation tags) and shrunk once, before anything else sees them. */
export async function normalizePhoto(input: Buffer): Promise<Buffer> {
  return sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}

/** A PNG of just the found object, background see-through. */
export async function makeCutout(photo: Buffer, found: FoundObject): Promise<Buffer> {
  const { left, top, right, bottom } = found.bounds;
  const width = right - left;
  const height = bottom - top;
  if (found.raster.length !== width * height) throw new Error("Mask size doesn't match its box");
  const { data } = await sharp(photo).extract({ left, top, width, height }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < width * height; i++) data[i * 4 + 3] = found.raster[i] ? 255 : 0;
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/**
 * The noun phrase SAM looks for. People are "person". For a comfort item, a
 * few words from how it looks ("white bunny") beat its pet name ("Bear"),
 * which SAM can't know.
 */
export function phraseFor(kind: "person" | "comfort", description?: string): string {
  if (kind === "person") return "person";
  // The thing itself comes before any "with ..." detail, and its noun comes last:
  // "a small, fluffy, white bunny with a grey patch" -> "white bunny".
  const main = (description ?? "").toLowerCase().split(/\b(with|that|and has|wearing)\b/)[0] ?? "";
  const words = main
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["a", "an", "the", "small", "big", "little", "large", "soft", "fluffy", "old", "very"].includes(w));
  return words.slice(-3).join(" ") || "toy";
}
