import type { LlmCompletionParams, LlmProvider } from "../provider";
import { LlmAuthError, LlmProviderError } from "../provider";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";
const CLAUDE_API_VERSION = "2023-06-01";

// Pulls just the human-readable message out of Claude's error body
// (`{ error: { message } }`) instead of surfacing the raw JSON blob.
function extractClaudeMessage(bodyText: string, status: number): string {
  try {
    const parsed = JSON.parse(bodyText);
    const message = parsed?.error?.message;
    if (typeof message === "string" && message) return message;
  } catch {
    // Non-JSON error body — fall through to the generic message below.
  }
  return `Claude API error (${status})`;
}

export class ClaudeProvider implements LlmProvider {
  constructor(private readonly apiKey: string) {}

  async complete({
    systemPrompt,
    userPrompt,
    maxTokens = 2048,
  }: LlmCompletionParams): Promise<string> {
    const res = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": CLAUDE_API_VERSION,
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const message = extractClaudeMessage(await res.text(), res.status);
      if (res.status === 401 || res.status === 403) {
        throw new LlmAuthError(message);
      }
      throw new LlmProviderError(message);
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text;
    if (typeof text !== "string") {
      throw new LlmProviderError("Claude API returned no text content");
    }
    return text;
  }
}
