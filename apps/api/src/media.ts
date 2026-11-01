import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { photoChecklist, type Event, type PhotoRef, type PlayerProfile } from "@socialstory/core";
import { DATA_DIR } from "./paths.js";
import { makeCutout, normalizePhoto, phraseFor, type Segmenter } from "./sam.js";

/**
 * The media step: photos the user adds against the photo to-do list.
 * Files live in .data/photos/ (git-ignored):
 *   events/<event id>/<to-do id>.jpg (+ -cutout.png)
 *   players/<player id>/comfort-<id>.jpg (+ -cutout.png): comfort items belong
 *   to the child, so one photo of Bear serves every story.
 * PhotoRef.src is relative to .data/photos/, which is where draw-story looks.
 */

export const photosDir = (dataDir = DATA_DIR) => resolve(dataDir, "photos");
/** Only these paths are ever served back. */
export const PHOTO_PATH = /^(events|players)\/[a-z0-9-]+\/[a-z0-9-]+(-cutout)?\.(jpg|png)$/;

function strip(event: Event): Event {
  return {
    ...event,
    people: event.people.map(({ photo: _p, ...rest }) => rest),
    places: event.places.map((p) => ({ ...p, photos: [] })),
  };
}

/** The to-do item for an id, whether or not it already has a photo. */
export function todoItem(event: Event, player: PlayerProfile, itemId: string) {
  const bare = { ...player, comforts: player.comforts.map(({ photo: _p, ...rest }) => rest) };
  return photoChecklist(strip(event), bare).items.find((i) => i.id === itemId);
}

export interface AddPhotoResult {
  event: Event;
  player: PlayerProfile;
  photo: PhotoRef;
  /** People and comfort items only: did SAM find them? */
  cutout: "made" | "not-found" | "not-needed" | "failed";
}

/** Saves the child's own photo on their profile, with a SAM cutout to draw them from. */
export async function addPlayerPhoto(
  args: { player: PlayerProfile; upload: Buffer; segment: Segmenter },
  dataDir = DATA_DIR,
): Promise<{ player: PlayerProfile; cutout: AddPhotoResult["cutout"] }> {
  const photo = await normalizePhoto(args.upload);
  const base = `players/${args.player.id}/photo`;
  const dir = resolve(photosDir(dataDir), `players/${args.player.id}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(photosDir(dataDir), `${base}.jpg`), photo);
  rmSync(resolve(photosDir(dataDir), `${base}-cutout.png`), { force: true });
  const ref: PhotoRef = { id: "player-photo", src: `${base}.jpg` };
  let cutout: AddPhotoResult["cutout"] = "not-found";
  try {
    const found = await args.segment(photo, phraseFor("person"));
    if (found) {
      writeFileSync(resolve(photosDir(dataDir), `${base}-cutout.png`), await makeCutout(photo, found));
      ref.cutout = `${base}-cutout.png`;
      cutout = "made";
    }
  } catch (err) {
    console.warn("SAM cutout failed:", (err as Error).message);
    cutout = "failed";
  }
  return { player: { ...args.player, photo: ref }, cutout };
}

export function removePlayerPhoto(player: PlayerProfile, dataDir = DATA_DIR): PlayerProfile {
  for (const rel of [player.photo?.src, player.photo?.cutout]) {
    if (rel && PHOTO_PATH.test(rel)) rmSync(resolve(photosDir(dataDir), rel), { force: true });
  }
  const { photo: _p, ...rest } = player;
  return rest as PlayerProfile;
}

/** Saves a photo for one to-do item, cutting the person or object out with SAM where that helps. */
export async function addPhoto(
  args: { event: Event; player: PlayerProfile; itemId: string; upload: Buffer; segment: Segmenter },
  dataDir = DATA_DIR,
): Promise<AddPhotoResult> {
  const { event, player, itemId } = args;
  const item = todoItem(event, player, itemId);
  if (!item) throw new Error("That photo isn't on this event's list.");
  const photo = await normalizePhoto(args.upload);

  const isComfort = item.attachTo.kind === "comfort";
  const base = isComfort ? `players/${player.id}/${itemId}` : `events/${event.id}/${itemId}`;
  const write = (rel: string, data: Buffer) => {
    const abs = resolve(photosDir(dataDir), rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, data);
  };
  write(`${base}.jpg`, photo);
  rmSync(resolve(photosDir(dataDir), `${base}-cutout.png`), { force: true });

  const ref: PhotoRef = { id: itemId, src: `${base}.jpg` };
  let cutout: AddPhotoResult["cutout"] = "not-needed";
  if (item.attachTo.kind === "person" || isComfort) {
    const target =
      item.attachTo.kind === "person"
        ? undefined
        : [...player.comforts, ...event.comforts].find((c) => c.id === (item.attachTo as { id: string }).id);
    try {
      const found = await args.segment(photo, phraseFor(isComfort ? "comfort" : "person", target?.appearance ?? target?.name));
      if (found) {
        write(`${base}-cutout.png`, await makeCutout(photo, found));
        ref.cutout = `${base}-cutout.png`;
        cutout = "made";
      } else {
        cutout = "not-found";
      }
    } catch (err) {
      console.warn("SAM cutout failed:", (err as Error).message);
      cutout = "failed"; // the photo itself still counts
    }
  }

  const at = item.attachTo;
  const plans = { ...event.photoPlans };
  delete plans[itemId]; // having the photo replaces any "can't get it" choice
  let nextEvent: Event = { ...event, photoPlans: plans };
  let nextPlayer = player;
  if (at.kind === "person") {
    nextEvent = {
      ...nextEvent,
      people: nextEvent.people.map((p) => (p.id === at.id ? { ...p, photo: ref } : p)),
      companions: nextEvent.companions.map((p) => (p.id === at.id ? { ...p, photo: ref } : p)),
    };
  } else if (at.kind === "comfort") {
    if (player.comforts.some((c) => c.id === at.id)) {
      nextPlayer = { ...player, comforts: player.comforts.map((c) => (c.id === at.id ? { ...c, photo: ref } : c)) };
    } else {
      nextEvent = { ...nextEvent, comforts: nextEvent.comforts.map((c) => (c.id === at.id ? { ...c, photo: ref } : c)) };
    }
  } else {
    const placeId = at.kind === "place" ? at.id : nextEvent.places[0]?.id;
    nextEvent = {
      ...nextEvent,
      places: nextEvent.places.map((p) => (p.id === placeId ? { ...p, photos: [...p.photos.filter((ph) => ph.id !== itemId), ref] } : p)),
    };
  }
  return { event: nextEvent, player: nextPlayer, photo: ref, cutout };
}

/** Takes a photo back off: the files are deleted and the to-do returns. */
export function removePhoto(args: { event: Event; player: PlayerProfile; itemId: string }, dataDir = DATA_DIR) {
  const { event, player, itemId } = args;
  const refs: PhotoRef[] = [];
  const keep = <T extends { photo?: PhotoRef }>(x: T): T => {
    if (x.photo?.id === itemId) {
      refs.push(x.photo);
      const { photo: _p, ...rest } = x;
      return rest as T;
    }
    return x;
  };
  const nextEvent: Event = {
    ...event,
    people: event.people.map(keep),
    companions: event.companions.map(keep),
    comforts: event.comforts.map(keep),
    places: event.places.map((p) => {
      refs.push(...p.photos.filter((ph) => ph.id === itemId));
      return { ...p, photos: p.photos.filter((ph) => ph.id !== itemId) };
    }),
  };
  const nextPlayer: PlayerProfile = { ...player, comforts: player.comforts.map(keep) };
  for (const ref of refs) {
    for (const rel of [ref.src, ref.cutout]) {
      if (rel && PHOTO_PATH.test(rel)) rmSync(resolve(photosDir(dataDir), rel), { force: true });
    }
  }
  return { event: nextEvent, player: nextPlayer };
}

export const photoFile = (rel: string, dataDir = DATA_DIR) => {
  if (!PHOTO_PATH.test(rel)) return undefined;
  const abs = resolve(photosDir(dataDir), rel);
  return existsSync(abs) ? abs : undefined;
};
