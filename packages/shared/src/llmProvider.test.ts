import { describe, expect, it } from "vitest";
import { LlmProviderIdSchema } from "./llmProvider";

describe("LlmProviderIdSchema", () => {
  it("accepts each supported provider", () => {
    expect(LlmProviderIdSchema.parse("claude")).toBe("claude");
    expect(LlmProviderIdSchema.parse("openai")).toBe("openai");
    expect(LlmProviderIdSchema.parse("free")).toBe("free");
  });

  it("rejects an unknown provider", () => {
    expect(() => LlmProviderIdSchema.parse("gemini")).toThrow();
  });
});
