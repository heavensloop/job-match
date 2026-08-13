import { describe, expect, it, vi } from "vitest";
import { FreeProvider } from "./free-provider";
import { completeOpenAiCompatible } from "./openai-compatible";

vi.mock("./openai-compatible", () => ({
  completeOpenAiCompatible: vi.fn().mockResolvedValue("mocked"),
}));

describe("FreeProvider", () => {
  it("delegates to completeOpenAiCompatible with the Groq endpoint/model", async () => {
    const provider = new FreeProvider("gsk-test");
    const result = await provider.complete({
      systemPrompt: "sys",
      userPrompt: "user",
    });

    expect(result).toBe("mocked");
    expect(completeOpenAiCompatible).toHaveBeenCalledWith(
      expect.objectContaining({
        apiUrl: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: "gsk-test",
        model: "llama-3.3-70b-versatile",
        providerLabel: "Groq",
      }),
    );
  });
});
