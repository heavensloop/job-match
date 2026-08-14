import { describe, expect, it } from "vitest";
import { getLlmProvider } from "./get-provider";
import { ClaudeProvider } from "./providers/claude-provider";
import { OpenAiProvider } from "./providers/openai-provider";
import { FreeProvider } from "./providers/free-provider";

describe("getLlmProvider", () => {
  it("returns a ClaudeProvider for 'claude'", () => {
    expect(getLlmProvider("claude", "k")).toBeInstanceOf(ClaudeProvider);
  });

  it("returns an OpenAiProvider for 'openai'", () => {
    expect(getLlmProvider("openai", "k")).toBeInstanceOf(OpenAiProvider);
  });

  it("returns a FreeProvider for 'free'", () => {
    expect(getLlmProvider("free", "k")).toBeInstanceOf(FreeProvider);
  });
});
