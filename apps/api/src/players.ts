import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PlayerProfile, samplePlayer } from "@socialstory/core";
import { DATA_DIR } from "./paths.js";

/**
 * Child profiles, one JSON file each in .data/players/ (the database
 * replaces this after the hackathon). The test child, Sam, is always
 * available; saving him writes his file, which then wins.
 */
const ID = /^[a-z0-9-]+$/;
const dir = (dataDir: string) => resolve(dataDir, "players");
const file = (id: string, dataDir: string) => resolve(dir(dataDir), `${id}.json`);

export function loadPlayer(id: string, dataDir = DATA_DIR): PlayerProfile | undefined {
  if (!ID.test(id)) return undefined;
  if (existsSync(file(id, dataDir))) return PlayerProfile.parse(JSON.parse(readFileSync(file(id, dataDir), "utf8")));
  return id === samplePlayer.id ? samplePlayer : undefined;
}

export function listPlayers(dataDir = DATA_DIR): PlayerProfile[] {
  const saved = existsSync(dir(dataDir))
    ? readdirSync(dir(dataDir))
        .filter((f) => f.endsWith(".json"))
        .map((f) => loadPlayer(f.slice(0, -5), dataDir))
        .filter((p): p is PlayerProfile => !!p)
    : [];
  return saved.some((p) => p.id === samplePlayer.id) ? saved : [samplePlayer, ...saved];
}

/** Makes a new id from the child's name: "player-maya-3f9c". */
export function newPlayerId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "child";
  return `player-${slug}-${Math.random().toString(16).slice(2, 6)}`;
}

export function savePlayer(input: unknown, dataDir = DATA_DIR): PlayerProfile {
  const profile = PlayerProfile.parse(input);
  if (!ID.test(profile.id)) throw new Error("Bad profile id");
  mkdirSync(dir(dataDir), { recursive: true });
  writeFileSync(file(profile.id, dataDir), JSON.stringify(profile, null, 2));
  return profile;
}
