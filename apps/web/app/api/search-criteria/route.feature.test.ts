import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestUser, deleteTestUser } from "@/test/db";
import { jsonRequest } from "@/test/http";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";
import { validSearchCriteriaInput } from "@/test/fixtures";

vi.mock("@/auth", () => mockAuthModule());

const { GET, POST } = await import("./route");

const URL = "http://localhost/api/search-criteria";

let userId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
  mockSessionUser(userId);
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("GET /api/search-criteria", () => {
  it("401s without a session or PAT", async () => {
    mockSessionUser(null);
    const res = await GET(jsonRequest(URL));
    expect(res.status).toBe(401);
  });

  it("lists only the current user's criteria sets", async () => {
    await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validSearchCriteriaInput({ name: "Mine" }),
      }),
    );

    const otherUserId = (await createTestUser()).id;
    try {
      mockSessionUser(otherUserId);
      await POST(
        jsonRequest(URL, {
          method: "POST",
          body: validSearchCriteriaInput({ name: "Not mine" }),
        }),
      );

      mockSessionUser(userId);
      const res = await GET(jsonRequest(URL));
      const body = await res.json();
      expect(body.searchCriteria).toHaveLength(1);
      expect(body.searchCriteria[0].name).toBe("Mine");
    } finally {
      await deleteTestUser(otherUserId);
    }
  });
});

describe("POST /api/search-criteria", () => {
  it("401s without a session", async () => {
    mockSessionUser(null);
    const res = await POST(
      jsonRequest(URL, { method: "POST", body: validSearchCriteriaInput() }),
    );
    expect(res.status).toBe(401);
  });

  it("creates a criteria set with schema defaults applied", async () => {
    const res = await POST(
      jsonRequest(URL, { method: "POST", body: validSearchCriteriaInput() }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.isDefault).toBe(false);
    expect(body.currency).toBe("USD");
    expect(body.exclusions).toEqual({ keywords: [], companies: [] });
  });

  it("400s on an invalid body (empty workMode)", async () => {
    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validSearchCriteriaInput({ workMode: [] }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("unsets isDefault on other criteria sets when creating a new default", async () => {
    const first = await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validSearchCriteriaInput({ name: "First", isDefault: true }),
      }),
    ).then((r) => r.json());
    expect(first.isDefault).toBe(true);

    const second = await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validSearchCriteriaInput({ name: "Second", isDefault: true }),
      }),
    ).then((r) => r.json());
    expect(second.isDefault).toBe(true);

    const list = await GET(jsonRequest(URL)).then((r) => r.json());
    const firstAfter = list.searchCriteria.find(
      (c: { id: string }) => c.id === first.id,
    );
    expect(firstAfter.isDefault).toBe(false);
  });
});
