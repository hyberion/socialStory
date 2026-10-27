/**
 * `pnpm smoke` from the repo root: one cheap call to Muse Spark to prove
 * the key in .env works. Prints the reply and token usage.
 */
import { runTextTask } from "./meta.js";

const result = await runTextTask("smoke", "Say hello in five words.");
console.log(`\nMuse Spark says: ${result.text}`);
console.log(
  `Tokens: ${result.usage.inputTokens} in, ${result.usage.outputTokens} out ` +
    `(${result.usage.reasoningTokens} reasoning)\n`,
);
