import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { generatePersonalAccessToken } from "@/lib/auth/pat";
import { createTestUser, deleteTestUser } from "@/test/db";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";

vi.mock("@/auth", () => mockAuthModule());

// Imported after the mock is registered so it picks up the mocked "@/auth".
const { getAuthContext, getSessionUserId } = await import("./context");

let userId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
  mockSessionUser(null);
});

afterEach(async () => {
  await deleteTestUser(userId);
});

function requestWithAuthHeader(value: string | null) {
  const headers = new Headers();
  if (value) headers.set("authorization", value);
  return new Request("http://localhost/api/whatever", { headers });
}

describe("getSessionUserId", () => {
  it("returns the session's user id when logged in", async () => {
    mockSessionUser(userId);
    await expect(getSessionUserId()).resolves.toBe(userId);
  });

  it("returns null when there's no session", async () => {
    mockSessionUser(null);
    await expect(getSessionUserId()).resolves.toBeNull();
  });
});

describe("getAuthContext", () => {
  it("falls back to the session when there's no Authorization header", async () => {
    mockSessionUser(userId);
    const ctx = await getAuthContext(requestWithAuthHeader(null));
    expect(ctx).toEqual({ userId });
  });

  it("returns null when there's neither a session nor a PAT", async () => {
    mockSessionUser(null);
    const ctx = await getAuthContext(requestWithAuthHeader(null));
    expect(ctx).toBeNull();
  });

  it("falls back to the session for non-Bearer Authorization headers", async () => {
    mockSessionUser(userId);
    const ctx = await getAuthContext(requestWithAuthHeader("Basic abc123"));
    expect(ctx).toEqual({ userId });
  });

  it("authenticates a valid PAT and updates lastUsedAt", async () => {
    const { token, tokenHash } = generatePersonalAccessToken();
    const pat = await db.personalAccessToken.create({
      data: { userId, name: "test token", tokenHash },
    });
    expect(pat.lastUsedAt).toBeNull();

    const ctx = await getAuthContext(requestWithAuthHeader(`Bearer ${token}`));
    expect(ctx).toEqual({ userId });

    const updated = await db.personalAccessToken.findUniqueOrThrow({
      where: { id: pat.id },
    });
    expect(updated.lastUsedAt).not.toBeNull();
  });

  it("rejects a revoked PAT", async () => {
    const { token, tokenHash } = generatePersonalAccessToken();
    await db.personalAccessToken.create({
      data: {
        userId,
        name: "revoked token",
        tokenHash,
        revokedAt: new Date(),
      },
    });

    const ctx = await getAuthContext(requestWithAuthHeader(`Bearer ${token}`));
    expect(ctx).toBeNull();
  });

  it("rejects an unknown PAT", async () => {
    const ctx = await getAuthContext(
      requestWithAuthHeader("Bearer jmc_pat_does-not-exist"),
    );
    expect(ctx).toBeNull();
  });
});
