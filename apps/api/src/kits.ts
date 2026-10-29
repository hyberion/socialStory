import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  KIT_FILE_PATTERN,
  PublishedKit,
  castFor,
  castIntro,
  pageFingerprint,
  summarizeKit,
  type Event,
  type KitSummary,
  type PlayerProfile,
  type Story,
} from "@socialstory/core";
import { DATA_DIR, imagesDir, publishedDir } from "./paths.js";

/**
 * Publishing: turns an approved story plus its pictures into a locked
 * snapshot in .data/published/<id>/. The player app only ever reads
 * published kits (principle 5).
 */

/** Written by draw-story next to the pictures: which page content each picture was drawn from. */
export interface DrawnFrom {
  /** page file name -> pageFingerprint at draw time */
  pages: Record<string, string>;
}

export const pageFile = (index: number) => `page-${String(index + 1).padStart(2, "0")}.png`;

export function readDrawnFrom(name: string, dataDir = DATA_DIR): DrawnFrom {
  const file = resolve(imagesDir(name, dataDir), "drawn-from.json");
  if (!existsSync(file)) return { pages: {} };
  return JSON.parse(readFileSync(file, "utf8")) as DrawnFrom;
}

export function writeDrawnFrom(name: string, drawn: DrawnFrom, dataDir = DATA_DIR) {
  writeFileSync(resolve(imagesDir(name, dataDir), "drawn-from.json"), JSON.stringify(drawn, null, 2));
}

export interface PublishWarning {
  page?: number;
  message: string;
}

export interface PublishResult {
  kit: PublishedKit;
  warnings: PublishWarning[];
  dir: string;
}

export function publishKit(
  args: { id: string; event: Event; player: PlayerProfile; story: Story; now?: Date },
  dataDir = DATA_DIR,
): PublishResult {
  const { id, event, player, story } = args;
  const sourceDir = imagesDir(id, dataDir);
  const drawn = readDrawnFrom(id, dataDir);
  const warnings: PublishWarning[] = [];

  const pages = story.pages.map((page, i) => {
    const file = pageFile(i);
    const hasImage = existsSync(resolve(sourceDir, file));
    if (!hasImage) {
      warnings.push({ page: i, message: `Page ${i + 1} has no picture yet; it will show words only.` });
    } else if (drawn.pages[file] && drawn.pages[file] !== pageFingerprint(page)) {
      warnings.push({
        page: i,
        message: `Page ${i + 1}'s picture was drawn for different words. Redraw it (draw-story --pages ${i + 1}) or keep it.`,
      });
    }
    return {
      section: page.section,
      sentences: page.sentences,
      image: hasImage ? file : undefined,
      imageAlt: page.sceneBrief,
    };
  });

  // Everyone who appears, with their approved portrait if one was drawn.
  const companionIds = event.companions.map((c) => c.id);
  const factsById = new Map(event.people.map((p) => [p.id, p.facts]));
  const cast = castFor(event, player).map((member) => {
    const file = `cast-${member.id}.png`;
    return {
      id: member.id,
      kind: member.kind,
      name: member.name,
      intro: castIntro(member, player, companionIds),
      facts: factsById.get(member.id) ?? [],
      portrait: existsSync(resolve(sourceDir, file)) ? file : undefined,
    };
  });

  const kit = PublishedKit.parse({
    id,
    title: story.title,
    eventStartsAt: event.startsAt,
    publishedAt: (args.now ?? new Date()).toISOString(),
    sensory: player.sensory,
    pages,
    cast,
  });

  // Build the new kit in a temporary folder, then swap it in, so the player
  // never sees a half-written kit.
  const root = publishedDir(dataDir);
  const finalDir = resolve(root, id);
  const tempDir = resolve(root, `.${id}-publishing`);
  rmSync(tempDir, { recursive: true, force: true });
  mkdirSync(tempDir, { recursive: true });
  const files = [...kit.pages.map((p) => p.image), ...kit.cast.map((m) => m.portrait)];
  for (const file of files) if (file) copyFileSync(resolve(sourceDir, file), resolve(tempDir, file));
  writeFileSync(resolve(tempDir, "kit.json"), JSON.stringify(kit, null, 2));
  rmSync(finalDir, { recursive: true, force: true });
  renameSync(tempDir, finalDir);

  return { kit, warnings, dir: finalDir };
}

export function loadKit(id: string, dataDir = DATA_DIR): PublishedKit | undefined {
  if (!/^[a-z0-9-]+$/.test(id)) return undefined;
  const file = resolve(publishedDir(dataDir), id, "kit.json");
  if (!existsSync(file)) return undefined;
  return PublishedKit.parse(JSON.parse(readFileSync(file, "utf8")));
}

/** Published kits, soonest event first. */
export function listKits(dataDir = DATA_DIR): KitSummary[] {
  const root = publishedDir(dataDir);
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => loadKit(d.name, dataDir))
    .filter((k): k is PublishedKit => !!k)
    .map(summarizeKit)
    .sort((a, b) => a.eventStartsAt.localeCompare(b.eventStartsAt));
}

/** Absolute path of a file inside a published kit, or undefined if the name isn't allowed. */
export function kitFilePath(id: string, file: string, dataDir = DATA_DIR): string | undefined {
  if (!/^[a-z0-9-]+$/.test(id) || !KIT_FILE_PATTERN.test(file)) return undefined;
  const path = resolve(publishedDir(dataDir), id, file);
  return existsSync(path) ? path : undefined;
}
