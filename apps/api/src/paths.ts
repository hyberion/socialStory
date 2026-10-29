import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Where generated and published content lives. Defaults to apps/api/.data
 * (git-ignored); set DATA_DIR to put it elsewhere (e.g. a Docker volume).
 * Works from src/ (tsx) and dist/ (built) alike.
 */
const here = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : resolve(here, "../.data");

export const storiesDir = (dataDir = DATA_DIR) => resolve(dataDir, "stories");
export const imagesDir = (name: string, dataDir = DATA_DIR) => resolve(dataDir, "images", name);
export const publishedDir = (dataDir = DATA_DIR) => resolve(dataDir, "published");
