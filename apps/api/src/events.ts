import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Event } from "@socialstory/core";
import { DATA_DIR } from "./paths.js";

/**
 * Events the user created, one JSON file each in .data/events/ (the
 * database replaces this after the hackathon). An event's id is also its
 * story's id, so the editor, pictures and publishing all find it.
 */
const ID = /^[a-z0-9-]+$/;
const dir = (dataDir: string) => resolve(dataDir, "events");
const file = (id: string, dataDir: string) => resolve(dir(dataDir), `${id}.json`);

export function loadEvent(id: string, dataDir = DATA_DIR): Event | undefined {
  if (!ID.test(id) || !existsSync(file(id, dataDir))) return undefined;
  return Event.parse(JSON.parse(readFileSync(file(id, dataDir), "utf8")));
}

export function listEvents(dataDir = DATA_DIR): Event[] {
  if (!existsSync(dir(dataDir))) return [];
  return readdirSync(dir(dataDir))
    .filter((f) => f.endsWith(".json"))
    .map((f) => loadEvent(f.slice(0, -5), dataDir))
    .filter((e): e is Event => !!e);
}

/** "haircut-with-ms-rosa-3f9c" */
export function newEventId(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "event";
  return `${slug}-${Math.random().toString(16).slice(2, 6)}`;
}

export function saveEvent(input: unknown, dataDir = DATA_DIR): Event {
  const event = Event.parse(input);
  if (!ID.test(event.id)) throw new Error("Bad event id");
  mkdirSync(dir(dataDir), { recursive: true });
  writeFileSync(file(event.id, dataDir), JSON.stringify(event, null, 2));
  return event;
}
