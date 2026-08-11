import { describe, expect, it } from "vitest";
import {
  generatePersonalAccessToken,
  hashToken,
  looksLikePersonalAccessToken,
} from "./pat";

describe("personal access tokens", () => {
  it("generates a token with the expected prefix and a matching hash", () => {
    const { token, tokenHash } = generatePersonalAccessToken();
    expect(token.startsWith("jmc_pat_")).toBe(true);
    expect(tokenHash).toBe(hashToken(token));
  });

  it("generates unique tokens across calls", () => {
    const a = generatePersonalAccessToken();
    const b = generatePersonalAccessToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it("hashToken is deterministic", () => {
    expect(hashToken("some-token")).toBe(hashToken("some-token"));
  });

  it("hashToken produces a 64-character hex sha256 digest", () => {
    expect(hashToken("some-token")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("looksLikePersonalAccessToken checks the prefix only", () => {
    const { token } = generatePersonalAccessToken();
    expect(looksLikePersonalAccessToken(token)).toBe(true);
    expect(looksLikePersonalAccessToken("not-a-pat")).toBe(false);
  });
});
