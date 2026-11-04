import { existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { loadKit } from "./kits.js";
import { DATA_DIR, publishedDir } from "./paths.js";

/**
 * Makes a published kit's pictures small enough to load instantly on a tablet
 * (Nov 4: each page was a 3-4 MB PNG straight from the image model, so pictures
 * crawled in a second after the words). Each PNG becomes a WebP at most 1600px
 * on its long side, about a tenth of the size and the same to the eye.
 *
 * Runs after publishing: the new files are written first, then kit.json is
 * swapped in one step, then the PNGs are removed, so the player never sees a
 * kit that points at a missing file.
 */
export async function shrinkKitImages(id: string, dataDir = DATA_DIR): Promise<number> {
  const kit = loadKit(id, dataDir);
  if (!kit) return 0;
  const dir = resolve(publishedDir(dataDir), id);
  const done = new Map<string, string>();
  const shrink = async (file: string | undefined) => {
    if (!file || !file.endsWith(".png")) return file;
    if (done.has(file)) return done.get(file);
    const webp = file.replace(/\.png$/, ".webp");
    try {
      await sharp(resolve(dir, file))
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(resolve(dir, webp));
      done.set(file, webp);
      return webp;
    } catch (err) {
      console.warn(`Couldn't shrink ${file}; keeping the PNG.`, (err as Error).message);
      return file;
    }
  };
  const pages = [];
  for (const page of kit.pages) pages.push({ ...page, image: await shrink(page.image) });
  const cast = [];
  for (const member of kit.cast) cast.push({ ...member, portrait: await shrink(member.portrait) });

  const tmp = resolve(dir, "kit.json.tmp");
  writeFileSync(tmp, JSON.stringify({ ...kit, pages, cast }, null, 2));
  renameSync(tmp, resolve(dir, "kit.json"));
  for (const png of done.keys()) if (existsSync(resolve(dir, png))) rmSync(resolve(dir, png));
  return done.size;
}
