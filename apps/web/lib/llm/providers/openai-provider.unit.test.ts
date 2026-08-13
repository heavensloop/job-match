import { describe, expect, it, vi } from "vitest";
import { OpenAiProvider } from "./openai-provider";
import { completeOpenAiCompatible } from "./openai-compatible";

vi.mock("./openai-compatible", () => ({
  completeOpenAiCompatible: vi.fn().mockResolvedValue("mocked"),
}));

describe("OpenAiProvider", () => {
  it("delegates to completeOpenAiCompatible with the OpenAI endpoint/model", async () => {
    const provider = new OpenAiProvider("sk-test");
    const result = await provider.complete({
      systemPrompt: "sys",
      userPrompt: "user",
    });

    expect(result).toBe("mocked");
    expect(completeOpenAiCompatible).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl: "https://api.openai.com/v1/chat/completions",
        apiKey: "sk-test",
        model: "gpt-4o-mini",
        providerLabel: "OpenAI",
      }),
    );
  });
});
