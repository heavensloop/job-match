import { LlmProviderError } from "./provider";

// LLMs sometimes wrap JSON in markdown fences despite being told not to;
// strip those before parsing so callers don't have to.
export function parseJsonResponse(text: string): unknown {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(stripped);
  } catch {
    throw new LlmProviderError(
      `LLM response was not valid JSON: ${stripped.slice(0, 200)}`,
    );
  }
}
