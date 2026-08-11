import { describe, expect, it } from "vitest";
import { nullsToUndefined } from "./serialize";

describe("nullsToUndefined", () => {
  it("converts null values to undefined", () => {
    expect(nullsToUndefined({ a: null, b: 1 })).toEqual({
      a: undefined,
      b: 1,
    });
  });

  it("leaves non-null values untouched", () => {
    expect(nullsToUndefined({ a: "x", b: 0, c: false })).toEqual({
      a: "x",
      b: 0,
      c: false,
    });
  });

  it("does not recurse into nested objects", () => {
    const input = { nested: { inner: null } };
    expect(nullsToUndefined(input)).toEqual({ nested: { inner: null } });
  });

  it("handles an empty object", () => {
    expect(nullsToUndefined({})).toEqual({});
  });
});
