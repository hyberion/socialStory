import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { makeCutout, normalizePhoto, phraseFor } from "./sam.js";

describe("SAM cutouts", () => {
  it("crops to the box and makes everything outside the mask see-through", async () => {
    const photo = await sharp({ create: { width: 20, height: 10, channels: 3, background: "#3366cc" } }).jpeg().toBuffer();
    // A 4x2 box at (5,3); mask covers the left half.
    const raster = Uint8Array.from([1, 1, 0, 0, 1, 1, 0, 0]);
    const png = await makeCutout(photo, { bounds: { left: 5, top: 3, right: 9, bottom: 5 }, raster });
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height, info.channels]).toEqual([4, 2, 4]);
    const alpha = [...Array(8).keys()].map((i) => data[i * 4 + 3]);
    expect(alpha).toEqual([255, 255, 0, 0, 255, 255, 0, 0]);
  });

  it("refuses a mask that doesn't fit its box", async () => {
    const photo = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#fff" } }).jpeg().toBuffer();
    await expect(makeCutout(photo, { bounds: { left: 0, top: 0, right: 4, bottom: 4 }, raster: new Uint8Array(3) })).rejects.toThrow();
  });

  it("straightens and shrinks big photos", async () => {
    const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#000" } }).jpeg().toBuffer();
    const meta = await sharp(await normalizePhoto(big)).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1600, 1200, "jpeg"]);
  });

  it("asks SAM for a person, or a short look-based phrase for a comfort item", () => {
    expect(phraseFor("person")).toBe("person");
    expect(phraseFor("comfort", "a small, fluffy, white bunny with a light grey patch")).toBe("white bunny");
    expect(phraseFor("comfort", "big, soft, dark gray over-ear headphones")).toBe("gray over-ear headphones");
    expect(phraseFor("comfort", "")).toBe("toy");
  });
});
