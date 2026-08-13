import type { LlmCompletionParams, LlmProvider } from "../provider";
import { LlmProviderError } from "../provider";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";
const CLAUDE_API_VERSION = "2023-06-01";

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
      throw new LlmProviderError(
        `Claude API error (${res.status}): ${await res.text()}`,
      );
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text;
    if (typeof text !== "string") {
      throw new LlmProviderError("Claude API returned no text content");
    }
    return text;
  }
}
