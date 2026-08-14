import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeProvider } from "./claude-provider";
import { LlmAuthError, LlmProviderError } from "../provider";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ClaudeProvider", () => {
  it("posts to the Messages API with the key and returns the text content", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ content: [{ text: "hello" }] }), {
        status: 200,
      }),
    );

    const provider = new ClaudeProvider("sk-test");
    const result = await provider.complete({
      systemPrompt: "sys",
      userPrompt: "user",
    });

    expect(result).toBe("hello");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.headers["x-api-key"]).toBe("sk-test");
    const body = JSON.parse(init.body);
    expect(body.system).toBe("sys");
    expect(body.messages).toEqual([{ role: "user", content: "user" }]);
  });

  it("throws LlmProviderError on a non-ok response", async () => {
    fetchMock.mockResolvedValue(new Response("bad key", { status: 500 }));

    const provider = new ClaudeProvider("sk-bad");
    await expect(
      provider.complete({ systemPrompt: "s", userPrompt: "u" }),
    ).rejects.toThrow(LlmProviderError);
  });

  it("throws LlmAuthError with just the provider's message on a 401", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "error",
          error: { type: "authentication_error", message: "invalid x-api-key" },
        }),
        { status: 401 },
      ),
    );

    const provider = new ClaudeProvider("sk-bad");
    const promise = provider.complete({ systemPrompt: "s", userPrompt: "u" });
    await expect(promise).rejects.toThrow(LlmAuthError);
    await expect(promise).rejects.toThrow("invalid x-api-key");
    await expect(promise).rejects.not.toThrow(/"type"|\{/);
  });

  it("throws LlmProviderError when there's no text content", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ content: [] }), { status: 200 }),
    );

    const provider = new ClaudeProvider("sk-test");
    await expect(
      provider.complete({ systemPrompt: "s", userPrompt: "u" }),
    ).rejects.toThrow(LlmProviderError);
  });
});
