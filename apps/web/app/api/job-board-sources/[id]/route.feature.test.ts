import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createTestUser, deleteTestUser } from "@/test/db";
import { jsonRequest } from "@/test/http";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";
import {
  validJobBoardSourceInput,
  validSearchCriteriaInput,
} from "@/test/fixtures";

vi.mock("@/auth", () => mockAuthModule());

const { GET, PATCH, DELETE } = await import("./route");

function withParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

let userId: string;
let criteriaId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
  mockSessionUser(userId);
  criteriaId = (
    await db.searchCriteria.create({
      data: { userId, ...validSearchCriteriaInput() },
    })
  ).id;
});

afterEach(async () => {
  await deleteTestUser(userId);
});

async function createSource(overrides: Record<string, unknown> = {}) {
  return db.jobBoardSource.create({
    data: validJobBoardSourceInput(criteriaId, overrides),
  });
}

describe("GET /api/job-board-sources/[id]", () => {
  it("401s without a session", async () => {
    const source = await createSource();
    mockSessionUser(null);
    const res = await GET(jsonRequest("http://x"), withParams(source.id));
    expect(res.status).toBe(401);
  });

  it("200s for an owned source", async () => {
    const source = await createSource({ name: "Mine" });
    const res = await GET(jsonRequest("http://x"), withParams(source.id));
    expect(res.status).toBe(200);
    expect((await res.json()).name).toBe("Mine");
  });

  it("404s (not 403) for a source under another user's criteria", async () => {
    const otherUserId = (await createTestUser()).id;
    try {
      const theirCriteria = await db.searchCriteria.create({
        data: { userId: otherUserId, ...validSearchCriteriaInput() },
      });
      const theirSource = await db.jobBoardSource.create({
        data: validJobBoardSourceInput(theirCriteria.id),
      });

      const res = await GET(
        jsonRequest("http://x"),
        withParams(theirSource.id),
      );
      expect(res.status).toBe(404);
    } finally {
      await deleteTestUser(otherUserId);
    }
  });
});

describe("PATCH /api/job-board-sources/[id]", () => {
  it("401s without a session", async () => {
    const source = await createSource();
    mockSessionUser(null);
    const res = await PATCH(
      jsonRequest("http://x", { method: "PATCH", body: { enabled: false } }),
      withParams(source.id),
    );
    expect(res.status).toBe(401);
  });

  it("partially updates fields", async () => {
    const source = await createSource({ enabled: true });
    const res = await PATCH(
      jsonRequest("http://x", { method: "PATCH", body: { enabled: false } }),
      withParams(source.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(false);
    expect(body.name).toBe(source.name);
  });

  it("404s when re-pointing to a criteriaId owned by someone else", async () => {
    const source = await createSource();
    const otherUserId = (await createTestUser()).id;
    try {
      const theirCriteria = await db.searchCriteria.create({
        data: { userId: otherUserId, ...validSearchCriteriaInput() },
      });

      const res = await PATCH(
        jsonRequest("http://x", {
          method: "PATCH",
          body: { criteriaId: theirCriteria.id },
        }),
        withParams(source.id),
      );
      expect(res.status).toBe(404);
    } finally {
      await deleteTestUser(otherUserId);
    }
  });
});

describe("DELETE /api/job-board-sources/[id]", () => {
  it("401s without a session", async () => {
    const source = await createSource();
    mockSessionUser(null);
    const res = await DELETE(
      jsonRequest("http://x", { method: "DELETE" }),
      withParams(source.id),
    );
    expect(res.status).toBe(401);
  });

  it("deletes an owned source", async () => {
    const source = await createSource();
    const res = await DELETE(
      jsonRequest("http://x", { method: "DELETE" }),
      withParams(source.id),
    );
    expect(res.status).toBe(204);

    await expect(
      db.jobBoardSource.findUniqueOrThrow({ where: { id: source.id } }),
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
