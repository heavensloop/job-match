import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { completeOpenAiCompatible } from "./openai-compatible";
import { LlmAuthError, LlmProviderError } from "../provider";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("completeOpenAiCompatible", () => {
  const baseParams = {
    apiUrl: "https://example.com/chat/completions",
    apiKey: "sk-test",
    model: "some-model",
    systemPrompt: "sys",
    userPrompt: "user",
    maxTokens: 100,
    providerLabel: "Example",
  };

  it("posts the chat-completions body and returns the message content", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "hello" } }] }),
        { status: 200 },
      ),
    );

    const result = await completeOpenAiCompatible(baseParams);
    expect(result).toBe("hello");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(baseParams.apiUrl);
    expect(init.headers.authorization).toBe("Bearer sk-test");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("some-model");
    expect(body.messages).toEqual([
      { role: "system", content: "sys" },
      { role: "user", content: "user" },
    ]);
  });

  it("throws LlmProviderError with the provider label on a non-ok response", async () => {
    fetchMock.mockResolvedValue(new Response("rate limited", { status: 429 }));

    await expect(completeOpenAiCompatible(baseParams)).rejects.toThrow(
      /Example API error \(429\)/,
    );
  });

  it("throws LlmAuthError with just the provider's message on a 401", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message: "Incorrect API key provided: gsk_***.",
            type: "invalid_request_error",
            param: null,
            code: "invalid_api_key",
          },
        }),
        { status: 401 },
      ),
    );

    const promise = completeOpenAiCompatible(baseParams);
    await expect(promise).rejects.toThrow(LlmAuthError);
    await expect(promise).rejects.toThrow(
      "Incorrect API key provided: gsk_***.",
    );
    // The raw JSON wrapper (type/param/code, braces) must not leak through.
    await expect(promise).rejects.not.toThrow(/"type"|"param"|\{/);
  });

  it("throws LlmAuthError on a 403 too", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "forbidden" } }), {
        status: 403,
      }),
    );

    await expect(completeOpenAiCompatible(baseParams)).rejects.toThrow(
      LlmAuthError,
    );
  });

  it("throws LlmProviderError when there's no message content", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ choices: [] }), { status: 200 }),
    );

    await expect(completeOpenAiCompatible(baseParams)).rejects.toThrow(
      LlmProviderError,
    );
  });
});
