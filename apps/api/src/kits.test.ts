import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { pageFingerprint, sampleEvent, samplePlayer, sampleStory } from "@socialstory/core";
import { listKits, loadKit, publishKit, writeDrawnFrom } from "./kits.js";
import { kitRoutes } from "./kitRoutes.js";

const PNG = Buffer.from("89504e470d0a1a0a", "hex"); // just the PNG signature; enough for tests

function setup(pictures: number[], portraits: string[] = []) {
  const dataDir = mkdtempSync(join(tmpdir(), "kits-"));
  const images = join(dataDir, "images", "doctor");
  mkdirSync(images, { recursive: true });
  const drawn: Record<string, string> = {};
  for (const n of pictures) {
    const file = `page-${String(n).padStart(2, "0")}.png`;
    writeFileSync(join(images, file), PNG);
    drawn[file] = pageFingerprint(sampleStory.pages[n - 1]!);
  }
  for (const id of portraits) writeFileSync(join(images, `cast-${id}.png`), PNG);
  writeDrawnFrom("doctor", { pages: drawn }, dataDir);
  return dataDir;
}

const publish = (dataDir: string, story = sampleStory) =>
  publishKit({ id: "doctor", event: sampleEvent, player: samplePlayer, story, now: new Date("2026-10-29T12:00:00Z") }, dataDir);

describe("publishKit", () => {
  it("snapshots the story and pictures into a kit", () => {
    const dataDir = setup([1, 2, 3, 4, 5]);
    const { kit, warnings } = publish(dataDir);
    expect(warnings).toEqual([]);
    expect(kit.pages).toHaveLength(sampleStory.pages.length);
    expect(kit.pages[0]?.image).toBe("page-01.png");
    expect(kit.pages[0]?.when).toBe(sampleEvent.startsAt);
    expect(kit.pages[1]?.when).toBeUndefined();
    expect(kit.sensory).toEqual(samplePlayer.sensory);
    expect(loadKit("doctor", dataDir)?.title).toBe(sampleStory.title);
    expect(listKits(dataDir).map((k) => k.cover)).toEqual(["page-01.png"]);
  });

  it("publishes pages without pictures, with a warning", () => {
    const dataDir = setup([1, 2]);
    const { kit, warnings } = publish(dataDir);
    expect(kit.pages[2]?.image).toBeUndefined();
    expect(warnings.map((w) => w.page)).toEqual([2, 3, 4]);
  });

  it("warns when a page's picture description changed after its picture was drawn", () => {
    const dataDir = setup([1, 2, 3, 4, 5]);
    const pages = sampleStory.pages.map((p, i) =>
      i === 1 ? { ...p, sceneBrief: "Sam and Dad wait at the bus stop." } : i === 2 ? { ...p, sentences: [...p.sentences, { text: "She is a new person to me.", type: "descriptive" as const }] } : p,
    );
    const { warnings } = publish(dataDir, { ...sampleStory, pages });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain("Page 2");
  });
});

describe("kit cast", () => {
  it("includes everyone, with portraits where they were drawn", () => {
    const { kit, dir } = publish(setup([1], ["player", "p-patel"]));
    expect(kit.cast.map((m) => m.id)).toEqual(["player", "c-dad", "p-patel", "p-nurse", "bear", "headphones", "transport"]);
    const patel = kit.cast.find((m) => m.id === "p-patel")!;
    expect(patel.portrait).toBe("cast-p-patel.png");
    expect(patel.intro).toBe("Dr. Patel is the doctor.");
    expect(patel.facts).toEqual(["Dr. Patel has a fish tank in the waiting room."]);
    expect(kit.cast.find((m) => m.id === "c-dad")?.portrait).toBeUndefined();
    expect(kit.cast.find((m) => m.id === "c-dad")?.intro).toBe("Dad is coming with me.");
    expect(kit.cast.find((m) => m.id === "bear")?.intro).toBe("Bear can come with me.");
    expect(kit.cast.find((m) => m.id === "transport")?.intro).toBe("The blue car takes me there.");
    expect(existsSync(join(dir, "cast-p-patel.png"))).toBe(true);
  });
});

describe("kit routes", () => {
  const dataDir = setup([1]);
  publish(dataDir);
  const app = new Hono().route("/api/kits", kitRoutes(dataDir));

  it("lists and loads kits", async () => {
    expect(await (await app.request("/api/kits")).json()).toHaveLength(1);
    const kit = (await (await app.request("/api/kits/doctor")).json()) as { id: string };
    expect(kit.id).toBe("doctor");
    expect((await app.request("/api/kits/nope")).status).toBe(404);
  });

  it("serves pictures by allowed name only", async () => {
    const ok = await app.request("/api/kits/doctor/page-01.png");
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("image/png");
    expect((await app.request("/api/kits/doctor/kit.json")).status).toBe(404);
    expect((await app.request("/api/kits/doctor/cast-nobody.png")).status).toBe(404);
    expect((await app.request("/api/kits/doctor/..%2F..%2Fstories%2Fdoctor.json")).status).toBe(404);
    expect((await app.request("/api/kits/..%2Fimages/page-01.png")).status).toBe(404);
  });
});
