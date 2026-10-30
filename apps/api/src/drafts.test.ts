import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { pageFingerprint, sampleStory, type PageDraft } from "@socialstory/core";
import { keepPicture, loadDraft, rewritePage, saveDraft } from "./drafts.js";
import { draftRoutes } from "./draftRoutes.js";
import { writeDrawnFrom } from "./kits.js";

/** A data folder with the sample story and one tiny picture per page, each picture holding its own page number. */
function setup() {
  const dataDir = mkdtempSync(join(tmpdir(), "drafts-"));
  mkdirSync(join(dataDir, "stories"), { recursive: true });
  writeFileSync(join(dataDir, "stories", "doctor.json"), JSON.stringify({ story: sampleStory, note: "kept" }));
  const images = join(dataDir, "images", "doctor");
  mkdirSync(images, { recursive: true });
  const drawn: Record<string, string> = {};
  sampleStory.pages.forEach((page, i) => {
    const file = `page-${String(i + 1).padStart(2, "0")}.png`;
    writeFileSync(join(images, file), `picture of original page ${i + 1}`);
    drawn[file] = pageFingerprint(page);
  });
  writeDrawnFrom("doctor", { pages: drawn }, dataDir);
  const picture = (n: number) => readFileSync(join(images, `page-${String(n).padStart(2, "0")}.png`), "utf8");
  return { dataDir, images, picture };
}

const pages = sampleStory.pages;

describe("saveDraft", () => {
  it("moves each picture with its page when pages are reordered", () => {
    const { dataDir, picture } = setup();
    // Swap pages 2 and 3.
    const story = { ...sampleStory, pages: [pages[0], pages[2], pages[1], pages[3], pages[4]] };
    saveDraft("doctor", { story, origins: [0, 2, 1, 3, 4] }, dataDir);
    expect(picture(2)).toBe("picture of original page 3");
    expect(picture(3)).toBe("picture of original page 2");
    // Fingerprints moved too, so neither picture looks out of date.
    const draft = loadDraft("doctor", dataDir)!;
    expect(draft.drawnFrom["page-02.png"]).toBe(pageFingerprint(pages[2]!));
  });

  it("archives the picture of a deleted page and leaves a new page without one", () => {
    const { dataDir, images, picture } = setup();
    const added = { section: "body" as const, sentences: [{ text: "We look at the fish.", type: "descriptive" as const }], inPicture: [] };
    // Delete page 2, add a new page after page 3.
    const story = { ...sampleStory, pages: [pages[0], pages[2], added, pages[3], pages[4]] };
    saveDraft("doctor", { story, origins: [0, 2, null, 3, 4] }, dataDir);
    expect(picture(2)).toBe("picture of original page 3");
    expect(existsSync(join(images, "page-03.png"))).toBe(false);
    expect(picture(4)).toBe("picture of original page 4");
    const history = readdirSync(join(images, "history"));
    expect(history).toHaveLength(1);
    expect(readFileSync(join(images, "history", history[0]!, "page-02.png"), "utf8")).toBe("picture of original page 2");
  });

  it("keeps the old words in history and the file's other fields", () => {
    const { dataDir } = setup();
    const story = { ...sampleStory, title: "Going to Dr. Patel" };
    saveDraft("doctor", { story, origins: [0, 1, 2, 3, 4] }, dataDir);
    const saved = JSON.parse(readFileSync(join(dataDir, "stories", "doctor.json"), "utf8"));
    expect(saved.story.title).toBe("Going to Dr. Patel");
    expect(saved.note).toBe("kept");
    expect(readdirSync(join(dataDir, "stories", "history"))).toHaveLength(1);
  });

  it("refuses a page that claims to come from two places", () => {
    const { dataDir } = setup();
    expect(() => saveDraft("doctor", { story: sampleStory, origins: [0, 0, 2, 3, 4] }, dataDir)).toThrow();
  });
});

describe("keepPicture", () => {
  it("marks a picture as fitting the page's new words", () => {
    const { dataDir } = setup();
    const changed = { ...pages[1]!, sceneBrief: "Sam and Dad wave from beside the blue car." };
    const story = { ...sampleStory, pages: pages.map((p, i) => (i === 1 ? changed : p)) };
    saveDraft("doctor", { story, origins: [0, 1, 2, 3, 4] }, dataDir);
    expect(loadDraft("doctor", dataDir)!.drawnFrom["page-02.png"]).not.toBe(pageFingerprint(changed));
    keepPicture("doctor", 1, dataDir);
    expect(loadDraft("doctor", dataDir)!.drawnFrom["page-02.png"]).toBe(pageFingerprint(changed));
  });
});

describe("rewritePage", () => {
  it("passes the note along and keeps the page's section and step", async () => {
    let seen = "";
    const fake = async (prompt: { input: string }): Promise<PageDraft> => {
      seen = prompt.input;
      return { section: "conclusion", stepId: "", sceneBrief: "Sam and Dad look at the fish tank.", inPicture: ["player", "c-dad"], sentences: [{ text: "We look at the fish while we wait.", type: "descriptive" }] };
    };
    const page = await rewritePage("doctor", { story: sampleStory, pageIndex: 2, note: "mention the fish more" }, fake);
    expect(seen).toContain('The parent asked: "mention the fish more"');
    expect(page.section).toBe("body");
    expect(page.stepId).toBe("s2");
    expect(page.sentences[0]?.text).toContain("fish");
  });
});

/** A writer that returns the sample story with a new title, so the route can be tested without Meta. */
const fakeWriter = () => async () => ({
  data: { title: "A fresh version", answers: sampleStory.answers, pages: sampleStory.pages.map((p) => ({ section: p.section, stepId: p.stepId ?? "", sceneBrief: p.sceneBrief ?? "", inPicture: p.inPicture, sentences: p.sentences })) },
  usage: { inputTokens: 0, outputTokens: 0, reasoningTokens: 0 },
});

describe("draft routes", () => {
  it("writes the story again, keeping the old one in history", async () => {
    const { dataDir, picture } = setup();
    const app = new Hono().route("/api/drafts", draftRoutes({ rewrite: async () => { throw new Error("unused"); }, writer: fakeWriter, dataDir }));
    const res = await app.request("/api/drafts/doctor/regenerate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { story: { title: string } }).story.title).toBe("A fresh version");
    expect(picture(1)).toBe("picture of original page 1");
    expect(readdirSync(join(dataDir, "stories", "history"))).toHaveLength(1);
  });

  it("loads, saves and publishes", async () => {
    const { dataDir } = setup();
    const app = new Hono().route("/api/drafts", draftRoutes({ rewrite: async () => { throw new Error("unused"); }, writer: fakeWriter, dataDir }));
    expect(await (await app.request("/api/drafts")).json()).toEqual(["doctor"]);
    const draft = (await (await app.request("/api/drafts/doctor")).json()) as { story: { title: string } };
    expect(draft.story.title).toBe(sampleStory.title);
    const put = await app.request("/api/drafts/doctor", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story: { ...sampleStory, title: "New title" }, origins: [0, 1, 2, 3, 4] }),
    });
    expect(put.status).toBe(200);
    const published = (await (await app.request("/api/drafts/doctor/publish", { method: "POST" })).json()) as { warnings: unknown[] };
    expect(published.warnings).toEqual([]);
    expect(existsSync(join(dataDir, "published", "doctor", "kit.json"))).toBe(true);
    expect((await app.request("/api/drafts/doctor/images/..%2F..%2Fstories%2Fdoctor.json")).status).toBe(404);
  });
});
