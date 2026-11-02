import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { Reasoning } from "openai/resources";
import type { ResponseUsage } from "openai/resources/responses/responses";
import type { z } from "zod";
import { TEXT_TASKS, estimateCost, type ReasoningEffort, type TextTaskName } from "@socialstory/core";
import { config } from "./config.js";
import { budget } from "./spend.js";

/**
 * The Meta Model API is OpenAI-SDK compatible. The SDK does NOT read
 * MODEL_API_KEY on its own, so the key is passed explicitly here.
 * This is the only module that should hold the key.
 */
export const meta = new OpenAI({
  baseURL: config.MODEL_API_BASE_URL,
  apiKey: config.MODEL_API_KEY,
});

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}

export interface TextResult {
  text: string;
  usage: Usage;
}

export interface StructuredResult<T> {
  data: T;
  usage: Usage;
}

function toUsage(usage: ResponseUsage | undefined): Usage {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    reasoningTokens: usage?.output_tokens_details?.reasoning_tokens ?? 0,
  };
}

export interface TaskOptions {
  instructions?: string;
  /** Override the task's usual reasoning effort (for experiments like `--effort medium`). */
  effort?: ReasoningEffort;
}

/** Model + reasoning settings for a task, from packages/core/src/models.ts. */
function settingsFor(task: TextTaskName, override?: ReasoningEffort) {
  const { model } = TEXT_TASKS[task];
  const effort = override ?? TEXT_TASKS[task].effort;
  // Meta accepts a few effort values the OpenAI types don't list (e.g. "max").
  return { model, reasoning: { effort } as Reasoning };
}

/**
 * Runs a named text task and returns plain text.
 * Never pick models inline elsewhere; go through a named task.
 */
export async function runTextTask(
  task: TextTaskName,
  input: string,
  options: TaskOptions = {},
): Promise<TextResult> {
  budget.check();
  const response = await meta.responses.create({
    ...settingsFor(task, options.effort),
    input,
    instructions: options.instructions,
  });
  const usage = toUsage(response.usage);
  budget.record(estimateCost(TEXT_TASKS[task].model, usage), task);
  return { text: response.output_text, usage };
}

/**
 * Runs a named task and makes the model answer as JSON matching `schema`
 * (Meta's strict structured output). The reply is parsed and type-checked.
 */
export async function runStructuredTask<S extends z.ZodTypeAny>(
  task: TextTaskName,
  schema: S,
  schemaName: string,
  input: string,
  options: TaskOptions = {},
): Promise<StructuredResult<z.infer<S>>> {
  budget.check();
  const response = await meta.responses.parse({
    ...settingsFor(task, options.effort),
    input,
    instructions: options.instructions,
    text: { format: zodTextFormat(schema, schemaName) },
  });
  const usage = toUsage(response.usage);
  budget.record(estimateCost(TEXT_TASKS[task].model, usage), task);
  if (!response.output_parsed) {
    throw new Error(`Model returned no parseable ${schemaName} (status: ${response.status}).`);
  }
  return { data: response.output_parsed as z.infer<S>, usage };
}
