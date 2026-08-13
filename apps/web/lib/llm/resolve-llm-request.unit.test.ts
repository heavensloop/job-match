import { describe, expect, it } from "vitest";
import { resolveLlmRequestConfig } from "./resolve-llm-request";
import { BadRequestError } from "@/lib/api/errors";

function requestWith(headers: Record<string, string>) {
  return new Request("http://localhost/api/x", { headers });
}

describe("resolveLlmRequestConfig", () => {
  it("resolves provider and key from headers", () => {
    const config = resolveLlmRequestConfig(
      requestWith({ "x-llm-provider": "claude", "x-llm-api-key": "sk-abc" }),
    );
    expect(config).toEqual({ providerId: "claude", apiKey: "sk-abc" });
  });

  it("throws BadRequestError when the key header is missing", () => {
    expect(() =>
      resolveLlmRequestConfig(requestWith({ "x-llm-provider": "claude" })),
    ).toThrow(BadRequestError);
  });

  it("throws BadRequestError when the provider header is missing", () => {
    expect(() =>
      resolveLlmRequestConfig(requestWith({ "x-llm-api-key": "sk-abc" })),
    ).toThrow(BadRequestError);
  });

  it("throws BadRequestError for an unknown provider", () => {
    expect(() =>
      resolveLlmRequestConfig(
        requestWith({ "x-llm-provider": "gemini", "x-llm-api-key": "sk-abc" }),
      ),
    ).toThrow(BadRequestError);
  });
});
