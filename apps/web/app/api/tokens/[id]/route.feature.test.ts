import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { generatePersonalAccessToken } from "@/lib/auth/pat";
import { createTestUser, deleteTestUser } from "@/test/db";
import { jsonRequest } from "@/test/http";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";

vi.mock("@/auth", () => mockAuthModule());

const { DELETE } = await import("./route");

function withParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

let userId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("DELETE /api/tokens/[id]", () => {
  it("401s without a session", async () => {
    mockSessionUser(null);
    const res = await DELETE(
      jsonRequest("http://x", { method: "DELETE" }),
      withParams("nonexistent"),
    );
    expect(res.status).toBe(401);
  });

  it("revokes an owned token", async () => {
    const { tokenHash } = generatePersonalAccessToken();
    const pat = await db.personalAccessToken.create({
      data: { userId, name: "laptop", tokenHash },
    });

    mockSessionUser(userId);
    const res = await DELETE(
      jsonRequest("http://x", { method: "DELETE" }),
      withParams(pat.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.revokedAt).not.toBeNull();

    const updated = await db.personalAccessToken.findUniqueOrThrow({
      where: { id: pat.id },
    });
    expect(updated.revokedAt).not.toBeNull();
  });

  it("404s for a nonexistent token", async () => {
    mockSessionUser(userId);
    const res = await DELETE(
      jsonRequest("http://x", { method: "DELETE" }),
      withParams("00000000-0000-0000-0000-000000000000"),
    );
    expect(res.status).toBe(404);
  });

  it("404s (not 403) when trying to revoke another user's token", async () => {
    const otherUserId = (await createTestUser()).id;
    try {
      const { tokenHash } = generatePersonalAccessToken();
      const pat = await db.personalAccessToken.create({
        data: { userId: otherUserId, name: "not yours", tokenHash },
      });

      mockSessionUser(userId);
      const res = await DELETE(
        jsonRequest("http://x", { method: "DELETE" }),
        withParams(pat.id),
      );
      expect(res.status).toBe(404);

      const untouched = await db.personalAccessToken.findUniqueOrThrow({
        where: { id: pat.id },
      });
      expect(untouched.revokedAt).toBeNull();
    } finally {
      await deleteTestUser(otherUserId);
    }
  });
});
