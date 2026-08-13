import { describe, expect, it } from "vitest";
import { parseJsonResponse } from "./parse-json-response";
import { LlmProviderError } from "./provider";

describe("parseJsonResponse", () => {
  it("parses plain JSON", () => {
    expect(parseJsonResponse('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips a ```json fence", () => {
    expect(parseJsonResponse('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("strips a bare ``` fence", () => {
    expect(parseJsonResponse('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("trims surrounding whitespace", () => {
    expect(parseJsonResponse('  \n {"a":1} \n ')).toEqual({ a: 1 });
  });

  it("throws LlmProviderError on invalid JSON", () => {
    expect(() => parseJsonResponse("not json at all")).toThrow(
      LlmProviderError,
    );
  });
});
