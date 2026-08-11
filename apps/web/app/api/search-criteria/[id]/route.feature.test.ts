import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createTestUser, deleteTestUser } from "@/test/db";
import { jsonRequest } from "@/test/http";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";
import { validSearchCriteriaInput } from "@/test/fixtures";

vi.mock("@/auth", () => mockAuthModule());

const { GET, PATCH, DELETE } = await import("./route");

function withParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

let userId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
  mockSessionUser(userId);
});

afterEach(async () => {
  await deleteTestUser(userId);
});

async function createCriteria(overrides: Record<string, unknown> = {}) {
  return db.searchCriteria.create({
    data: { userId, ...validSearchCriteriaInput(overrides) },
  });
}

describe("GET /api/search-criteria/[id]", () => {
  it("401s without a session or PAT", async () => {
    mockSessionUser(null);
    const res = await GET(jsonRequest("http://x"), withParams("anything"));
    expect(res.status).toBe(401);
  });

  it("404s for a nonexistent id", async () => {
    const res = await GET(
      jsonRequest("http://x"),
      withParams("00000000-0000-0000-0000-000000000000"),
    );
    expect(res.status).toBe(404);
  });

  it("404s (not 403) for another user's criteria set", async () => {
    const otherUserId = (await createTestUser()).id;
    try {
      mockSessionUser(otherUserId);
      const theirs = await db.searchCriteria.create({
        data: { userId: otherUserId, ...validSearchCriteriaInput() },
      });

      mockSessionUser(userId);
      const res = await GET(jsonRequest("http://x"), withParams(theirs.id));
      expect(res.status).toBe(404);
    } finally {
      await deleteTestUser(otherUserId);
    }
  });

  it("200s for an owned criteria set", async () => {
    const criteria = await createCriteria({ name: "Mine" });
    const res = await GET(jsonRequest("http://x"), withParams(criteria.id));
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Mine");
  });
});

describe("PATCH /api/search-criteria/[id]", () => {
  it("401s without a session", async () => {
    const criteria = await createCriteria();
    mockSessionUser(null);
    const res = await PATCH(
      jsonRequest("http://x", { method: "PATCH", body: { name: "New" } }),
      withParams(criteria.id),
    );
    expect(res.status).toBe(401);
  });

  it("partially updates fields not included in the body", async () => {
    const criteria = await createCriteria({ name: "Original" });
    const res = await PATCH(
      jsonRequest("http://x", {
        method: "PATCH",
        body: { name: "Renamed" },
      }),
      withParams(criteria.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Renamed");
    expect(body.workMode).toEqual(["remote"]);
  });

  it("unsets isDefault on the other criteria sets, not itself, when set true", async () => {
    const a = await createCriteria({ name: "A", isDefault: true });
    const b = await createCriteria({ name: "B" });

    const res = await PATCH(
      jsonRequest("http://x", {
        method: "PATCH",
        body: { isDefault: true },
      }),
      withParams(b.id),
    );
    expect((await res.json()).isDefault).toBe(true);

    const aAfter = await db.searchCriteria.findUniqueOrThrow({
      where: { id: a.id },
    });
    expect(aAfter.isDefault).toBe(false);
  });

  it("404s for another user's criteria set", async () => {
    const otherUserId = (await createTestUser()).id;
    try {
      mockSessionUser(otherUserId);
      const theirs = await db.searchCriteria.create({
        data: { userId: otherUserId, ...validSearchCriteriaInput() },
      });

      mockSessionUser(userId);
      const res = await PATCH(
        jsonRequest("http://x", { method: "PATCH", body: { name: "hijack" } }),
        withParams(theirs.id),
      );
      expect(res.status).toBe(404);
    } finally {
      await deleteTestUser(otherUserId);
    }
  });
});

describe("DELETE /api/search-criteria/[id]", () => {
  it("401s without a session", async () => {
    const criteria = await createCriteria();
    mockSessionUser(null);
    const res = await DELETE(
      jsonRequest("http://x", { method: "DELETE" }),
      withParams(criteria.id),
    );
    expect(res.status).toBe(401);
  });

  it("deletes an owned criteria set", async () => {
    const criteria = await createCriteria();
    const res = await DELETE(
      jsonRequest("http://x", { method: "DELETE" }),
      withParams(criteria.id),
    );
    expect(res.status).toBe(204);

    await expect(
      db.searchCriteria.findUniqueOrThrow({ where: { id: criteria.id } }),
    ).rejects.toThrow();
  });

  it("404s for a nonexistent id", async () => {
    const res = await DELETE(
      jsonRequest("http://x", { method: "DELETE" }),
      withParams("00000000-0000-0000-0000-000000000000"),
    );
    expect(res.status).toBe(404);
  });
});
