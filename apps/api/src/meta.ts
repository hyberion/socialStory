import OpenAI from "openai";
import { TEXT_TASKS, type TextTaskName } from "@socialstory/core";
import { config } from "./config.js";

/**
 * The Meta Model API is OpenAI-SDK compatible. The SDK does NOT read
 * MODEL_API_KEY on its own, so the key is passed explicitly here.
 * This is the only module that should hold the key.
 */
export const meta = new OpenAI({
  baseURL: config.MODEL_API_BASE_URL,
  apiKey: config.MODEL_API_KEY,
});

export interface TextResult {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
  };
}

/**
 * Runs a named text task with the model and reasoning effort set in
 * packages/core/src/models.ts. Never pick models inline elsewhere.
 */
export async function runTextTask(
  task: TextTaskName,
  input: string,
  options: { instructions?: string } = {},
): Promise<TextResult> {
  const { model, effort } = TEXT_TASKS[task];
  const response = await meta.responses.create({
    model,
    input,
    instructions: options.instructions,
    reasoning: { effort },
  });

  return {
    text: response.output_text,
    usage: {
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
      reasoningTokens: response.usage?.output_tokens_details?.reasoning_tokens ?? 0,
    },
  };
}
