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
  /**
   * Row-major 0/1 values, width x height. SAM's raster has its own size, which
   * can differ from the box's; it's stretched to the box when the cutout is made.
   */
  raster: Uint8Array;
  width: number;
  height: number;
  confidence?: number;
}

export type Segmenter = (photo: Buffer, phrase: string) => Promise<FoundObject | undefined>;

/** Photos are straightened (phone rotation tags) and shrunk once, before anything else sees them. */
export async function normalizePhoto(input: Buffer): Promise<Buffer> {
  return sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
}

/** A PNG of just the found object, background see-through. */
export async function makeCutout(photo: Buffer, found: FoundObject): Promise<Buffer> {
  if (found.raster.length !== found.width * found.height) throw new Error("Mask data doesn't match its own size");
  const meta = await sharp(photo).metadata();
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));
  const left = clamp(found.bounds.left, meta.width! - 1);
  const top = clamp(found.bounds.top, meta.height! - 1);
  const width = clamp(found.bounds.right, meta.width!) - left;
  const height = clamp(found.bounds.bottom, meta.height!) - top;
  if (width < 2 || height < 2) throw new Error("Mask box is outside the photo");

  // Stretch SAM's raster to the box if it came at a different size.
  let mask: Uint8Array = found.raster;
  if (found.width !== width || found.height !== height) {
    const grey = Buffer.from(found.raster.map((v) => (v ? 255 : 0)));
    mask = await sharp(grey, { raw: { width: found.width, height: found.height, channels: 1 } })
      .resize(width, height, { fit: "fill", kernel: "linear" })
      .extractChannel(0)
      .raw()
      .toBuffer();
  }
  const on = (i: number) => (mask === found.raster ? mask[i]! > 0 : mask[i]! >= 128);
  const { data } = await sharp(photo).extract({ left, top, width, height }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < width * height; i++) data[i * 4 + 3] = on(i) ? 255 : 0;
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
