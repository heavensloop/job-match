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

const { GET, POST } = await import("./route");

const URL = "http://localhost/api/job-board-sources";

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

describe("GET /api/job-board-sources", () => {
  it("401s without a session", async () => {
    mockSessionUser(null);
    const res = await GET(jsonRequest(URL));
    expect(res.status).toBe(401);
  });

  it("lists sources scoped to the current user across all their criteria", async () => {
    await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validJobBoardSourceInput(criteriaId),
      }),
    );

    const res = await GET(jsonRequest(URL));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.jobBoardSources).toHaveLength(1);
  });

  it("filters by criteriaId when given", async () => {
    const otherCriteriaId = (
      await db.searchCriteria.create({
        data: { userId, ...validSearchCriteriaInput({ name: "Other" }) },
      })
    ).id;
    await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validJobBoardSourceInput(criteriaId, { name: "A" }),
      }),
    );
    await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validJobBoardSourceInput(otherCriteriaId, { name: "B" }),
      }),
    );

    const res = await GET(jsonRequest(`${URL}?criteriaId=${criteriaId}`));
    const body = await res.json();
    expect(body.jobBoardSources).toHaveLength(1);
    expect(body.jobBoardSources[0].name).toBe("A");
  });

  it("404s when filtering by a criteriaId owned by someone else", async () => {
    const otherUserId = (await createTestUser()).id;
    try {
      const theirCriteria = await db.searchCriteria.create({
        data: { userId: otherUserId, ...validSearchCriteriaInput() },
      });

      const res = await GET(
        jsonRequest(`${URL}?criteriaId=${theirCriteria.id}`),
      );
      expect(res.status).toBe(404);
    } finally {
      await deleteTestUser(otherUserId);
    }
  });
});

describe("POST /api/job-board-sources", () => {
  it("401s without a session", async () => {
    mockSessionUser(null);
    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validJobBoardSourceInput(criteriaId),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("creates a source with schema defaults applied", async () => {
    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validJobBoardSourceInput(criteriaId),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.cadence).toBe("daily");
    expect(body.enabled).toBe(true);
  });

  it("400s on an invalid body (non-URL baseUrl)", async () => {
    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validJobBoardSourceInput(criteriaId, { baseUrl: "not-a-url" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("404s when the criteriaId belongs to someone else", async () => {
    const otherUserId = (await createTestUser()).id;
    try {
      const theirCriteria = await db.searchCriteria.create({
        data: { userId: otherUserId, ...validSearchCriteriaInput() },
      });

      const res = await POST(
        jsonRequest(URL, {
          method: "POST",
          body: validJobBoardSourceInput(theirCriteria.id),
        }),
      );
      expect(res.status).toBe(404);
    } finally {
      await deleteTestUser(otherUserId);
    }
  });
});
