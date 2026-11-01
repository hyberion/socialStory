import { decodeMaskToRaster, parseImageStream, recordsOfKind, type ResponsesEvent } from "@meta-sam/parser";
import { MODEL_IDS } from "@socialstory/core";
import { meta } from "./meta.js";
import type { Segmenter } from "./sam.js";

/** Kept apart from sam.ts so tests of the cutout logic don't need a Meta key. */
/** The real thing: one SAM 3.1 call. Picks the most confident object, or the biggest if no scores. */
export const samSegment: Segmenter = async (photo, phrase) => {
  // Meta's SAM request uses fields the OpenAI types don't know about, so it's built loosely.
  const stream = (await meta.responses.create({
    model: MODEL_IDS.segment,
    store: false,
    stream: true,
    metadata: { include_confidence: "true" },
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: phrase },
          { type: "input_image", image_url: `data:image/jpeg;base64,${photo.toString("base64")}`, detail: "auto" },
        ],
      },
    ],
  } as never)) as unknown as AsyncIterable<ResponsesEvent>;

  const result = await parseImageStream(stream).finalResult;
  const masks = recordsOfKind(result.records, "mask");
  if (!masks.length) return undefined;
  const area = (m: (typeof masks)[number]) => (m.bounds.right - m.bounds.left) * (m.bounds.bottom - m.bounds.top);
  const best = [...masks].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0) || area(b) - area(a))[0]!;
  return { bounds: best.bounds, raster: decodeMaskToRaster(best.mask), confidence: best.confidence };
};

