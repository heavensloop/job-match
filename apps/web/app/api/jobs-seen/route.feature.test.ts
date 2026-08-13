import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { generatePersonalAccessToken } from "@/lib/auth/pat";
import { createTestUser, deleteTestUser } from "@/test/db";
import { bearer, jsonRequest } from "@/test/http";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";

vi.mock("@/auth", () => mockAuthModule());

const { GET } = await import("./route");

const URL = "http://localhost/api/jobs-seen";

let userId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
  mockSessionUser(userId);
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("GET /api/jobs-seen", () => {
  it("401s without a session or PAT", async () => {
    mockSessionUser(null);
    const res = await GET(
      jsonRequest(`${URL}?url=https://boards.greenhouse.io/example/jobs/1`),
    );
    expect(res.status).toBe(401);
  });

  it("400s without a url query parameter", async () => {
    const res = await GET(jsonRequest(URL));
    expect(res.status).toBe(400);
  });

  it("returns a null firstSeenAt for a url never recorded", async () => {
    const res = await GET(
      jsonRequest(`${URL}?url=https://boards.greenhouse.io/example/jobs/1`),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ firstSeenAt: null });
  });

  it("returns firstSeenAt for a url already in jobs_seen", async () => {
    const url = "https://boards.greenhouse.io/example/jobs/1";
    const jobSeen = await db.jobSeen.create({
      data: { userId, url, title: "Engineer", company: "Acme" },
    });

    const res = await GET(jsonRequest(`${URL}?url=${encodeURIComponent(url)}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      firstSeenAt: jobSeen.firstSeenAt.toISOString(),
    });
  });

  it("scopes lookups to the authenticated user", async () => {
    const url = "https://boards.greenhouse.io/example/jobs/1";
    const otherUser = await createTestUser();
    await db.jobSeen.create({
      data: { userId: otherUser.id, url, title: "Engineer", company: "Acme" },
    });

    const res = await GET(jsonRequest(`${URL}?url=${encodeURIComponent(url)}`));
    expect(await res.json()).toEqual({ firstSeenAt: null });

    await deleteTestUser(otherUser.id);
  });

  it("accepts PAT auth", async () => {
    mockSessionUser(null);
    const { token, tokenHash } = generatePersonalAccessToken();
    await db.personalAccessToken.create({
      data: { userId, name: "test token", tokenHash },
    });

    const res = await GET(
      jsonRequest(
        `${URL}?url=${encodeURIComponent("https://boards.greenhouse.io/example/jobs/1")}`,
        { headers: bearer(token) },
      ),
    );
    expect(res.status).toBe(200);
  });
});
