import { IMAGE_TASKS, type ImageTaskName } from "@socialstory/core";
import { meta } from "./meta.js";

/**
 * Muse Image through the Responses API, the endpoint Meta documents for
 * sending several reference images in one request.
 *
 * Privacy and predictability:
 * - `store: false` so Meta keeps no conversation state for these calls.
 * - Web and image search are off: the model must never look up a real
 *   "Dr. Patel" online, and every picture is built only from what we send.
 */

export interface ReferenceImage {
  /** PNG or WEBP bytes. */
  data: Buffer;
  mimeType: "image/png" | "image/webp" | "image/jpeg";
}

export interface GeneratedImage {
  data: Buffer;
  mimeType: "image/png";
  /** Wall-clock seconds the request took. */
  seconds: number;
}

export async function generateImage(
  task: ImageTaskName,
  prompt: string,
  references: ReferenceImage[] = [],
): Promise<GeneratedImage> {
  const settings = IMAGE_TASKS[task];
  const started = Date.now();

  const content = [
    { type: "input_text", text: prompt },
    ...references.map((ref) => ({
      type: "input_image",
      image_url: `data:${ref.mimeType};base64,${ref.data.toString("base64")}`,
    })),
  ];

  // Meta's image tool takes fields the OpenAI types don't know about, so this request is built loosely.
  const request = {
    model: settings.model,
    store: false,
    input: [{ role: "user", content }],
    tools: [
      {
        type: "image_generation",
        size: settings.size,
        output_format: "png",
        reasoning_strength: settings.reasoningStrength,
        enable_image_search: false,
        enable_web_search: false,
        enable_shell: false,
      },
    ],
  };
  const response = await meta.responses.create(request as never);

  const call = response.output.find((item) => item.type === "image_generation_call");
  if (!call || call.type !== "image_generation_call" || !call.result) {
    const kinds = response.output.map((item) => item.type).join(", ") || "nothing";
    throw new Error(
      `No image came back (status: ${response.status}; output: ${kinds}). ` +
        (response.output_text ? `The model said: "${response.output_text.slice(0, 300)}"` : ""),
    );
  }

  return {
    data: Buffer.from(call.result, "base64"),
    mimeType: "image/png",
    seconds: (Date.now() - started) / 1000,
  };
}
