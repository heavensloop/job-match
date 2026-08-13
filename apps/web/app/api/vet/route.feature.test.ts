import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createTestUser, deleteTestUser } from "@/test/db";
import { jsonRequest, llmHeaders } from "@/test/http";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";
import {
  completeMock,
  mockLlmJsonResponse,
  mockLlmModule,
  mockLlmTextResponse,
} from "@/test/mock-llm";
import { validSearchCriteriaInput } from "@/test/fixtures";

vi.mock("@/auth", () => mockAuthModule());
vi.mock("@/lib/llm/get-provider", () => mockLlmModule());

const { POST } = await import("./route");

const URL = "http://localhost/api/vet";

const validVettingResult = {
  score: 82,
  recommendation: "strong_match",
  summary: "Good overlap on skills.",
};

function vetBody(overrides: Record<string, unknown> = {}) {
  return {
    jobUrl: "https://boards.greenhouse.io/example/jobs/1",
    jobTitle: "Senior Engineer",
    company: "Acme Corp",
    jobDescriptionText: "We need someone who loves difference engines.",
    ...overrides,
  };
}

let userId: string;
let criteriaId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
  mockSessionUser(userId);
  completeMock.mockReset();

  await db.profile.create({
    data: { userId, legalName: "Ada Lovelace", email: "ada@example.com" },
  });
  criteriaId = (
    await db.searchCriteria.create({
      data: { userId, ...validSearchCriteriaInput() },
    })
  ).id;
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("POST /api/vet", () => {
  it("401s without a session or PAT", async () => {
    mockSessionUser(null);
    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: vetBody({ criteriaId }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("400s when the LLM headers are missing", async () => {
    const res = await POST(
      jsonRequest(URL, { method: "POST", body: vetBody({ criteriaId }) }),
    );
    expect(res.status).toBe(400);
  });

  it("404s when the user has no profile", async () => {
    await db.profile.delete({ where: { userId } });
    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: vetBody({ criteriaId }),
      }),
    );
    expect(res.status).toBe(404);
  });

  it("404s when the criteria set doesn't belong to the user", async () => {
    const otherUserId = (await createTestUser()).id;
    try {
      const theirCriteria = await db.searchCriteria.create({
        data: { userId: otherUserId, ...validSearchCriteriaInput() },
      });

      const res = await POST(
        jsonRequest(URL, {
          method: "POST",
          headers: llmHeaders(),
          body: vetBody({ criteriaId: theirCriteria.id }),
        }),
      );
      expect(res.status).toBe(404);
    } finally {
      await deleteTestUser(otherUserId);
    }
  });

  it("vets a new job, creating jobs_seen and application_drafts rows", async () => {
    mockLlmJsonResponse(validVettingResult);

    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: vetBody({ criteriaId }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.vettingSnapshot.score).toBe(82);
    expect(body.vettingSnapshot.recommendation).toBe("strong_match");
    expect(completeMock).toHaveBeenCalledTimes(1);

    const jobSeen = await db.jobSeen.findUniqueOrThrow({
      where: { userId_url: { userId, url: vetBody().jobUrl } },
    });
    expect(jobSeen.sourceId).toBeNull();
  });

  it("serves a cached draft without calling the LLM again", async () => {
    mockLlmJsonResponse(validVettingResult);
    const first = await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: vetBody({ criteriaId }),
      }),
    );
    expect(first.status).toBe(201);

    const second = await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: vetBody({ criteriaId }),
      }),
    );
    expect(second.status).toBe(200);
    expect(completeMock).toHaveBeenCalledTimes(1);
  });

  it("re-vets when the profile changed since the cached draft", async () => {
    mockLlmJsonResponse(validVettingResult);
    await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: vetBody({ criteriaId }),
      }),
    );
    expect(completeMock).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => setTimeout(resolve, 10));
    await db.profile.update({
      where: { userId },
      data: { legalName: "Ada King" },
    });

    mockLlmJsonResponse({ ...validVettingResult, score: 55 });
    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: vetBody({ criteriaId }),
      }),
    );
    expect(res.status).toBe(200);
    expect(completeMock).toHaveBeenCalledTimes(2);
    expect((await res.json()).vettingSnapshot.score).toBe(55);
  });

  it("502s when the LLM response isn't valid JSON", async () => {
    mockLlmTextResponse("not json");
    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: vetBody({ criteriaId }),
      }),
    );
    expect(res.status).toBe(502);
  });

  it("502s when the LLM's JSON doesn't match VettingResultSchema", async () => {
    mockLlmJsonResponse({ score: "not a number" });
    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: vetBody({ criteriaId }),
      }),
    );
    expect(res.status).toBe(502);
  });
});
