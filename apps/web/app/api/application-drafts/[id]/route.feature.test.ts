import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createTestUser, deleteTestUser } from "@/test/db";
import { jsonRequest } from "@/test/http";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";
import {
  validJobProfileInput,
  validSearchCriteriaInput,
} from "@/test/fixtures";

vi.mock("@/auth", () => mockAuthModule());

const { GET } = await import("./route");

function withParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

let userId: string;
let personId: string;
let criteriaId: string;
let jobProfileId: string;
let jobId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
  mockSessionUser(userId);

  personId = (
    await db.person.create({
      data: { userId, legalName: "Ada Lovelace", email: "ada@example.com" },
    })
  ).id;
  criteriaId = (
    await db.searchCriteria.create({
      data: { userId, ...validSearchCriteriaInput({ name: "Backend" }) },
    })
  ).id;
  jobProfileId = (
    await db.jobProfile.create({
      data: { personId, ...validJobProfileInput({ isDefault: true }) },
    })
  ).id;
  jobId = (
    await db.jobSeen.create({
      data: {
        userId,
        url: "https://boards.greenhouse.io/example/jobs/1",
        title: "Senior Engineer",
        company: "Acme Corp",
      },
    })
  ).id;
});

afterEach(async () => {
  await deleteTestUser(userId);
});

async function createDraft(overrides: Record<string, unknown> = {}) {
  return db.applicationDraft.create({
    data: {
      userId,
      jobId,
      criteriaId,
      jobProfileId,
      vettingSnapshot: {
        score: 82,
        recommendation: "strong_match",
        summary: "Good overlap on skills.",
        strengths: ["Strong TypeScript background"],
        gaps: [
          {
            category: "location",
            description: "Onsite required",
            severity: "high",
          },
        ],
      },
      ...overrides,
    },
  });
}

describe("GET /api/application-drafts/[id]", () => {
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

  it("404s (not 403) for another user's draft", async () => {
    const otherUserId = (await createTestUser()).id;
    try {
      const otherPersonId = (
        await db.person.create({
          data: {
            userId: otherUserId,
            legalName: "Other Person",
            email: "other@example.com",
          },
        })
      ).id;
      const otherCriteriaId = (
        await db.searchCriteria.create({
          data: { userId: otherUserId, ...validSearchCriteriaInput() },
        })
      ).id;
      const otherJobProfileId = (
        await db.jobProfile.create({
          data: {
            personId: otherPersonId,
            ...validJobProfileInput({ isDefault: true }),
          },
        })
      ).id;
      const otherJobId = (
        await db.jobSeen.create({
          data: {
            userId: otherUserId,
            url: "https://boards.greenhouse.io/other/jobs/2",
            title: "Other Job",
            company: "Other Co",
          },
        })
      ).id;
      const theirs = await db.applicationDraft.create({
        data: {
          userId: otherUserId,
          jobId: otherJobId,
          criteriaId: otherCriteriaId,
          jobProfileId: otherJobProfileId,
          vettingSnapshot: {
            score: 50,
            recommendation: "possible_match",
            summary: "n/a",
          },
        },
      });

      mockSessionUser(userId);
      const res = await GET(jsonRequest("http://x"), withParams(theirs.id));
      expect(res.status).toBe(404);
    } finally {
      await deleteTestUser(otherUserId);
    }
  });

  it("200s for an owned draft, including job and criteria info", async () => {
    const draft = await createDraft();
    const res = await GET(jsonRequest("http://x"), withParams(draft.id));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.vettingSnapshot.score).toBe(82);
    expect(body.vettingSnapshot.gaps).toHaveLength(1);
    expect(body.job).toEqual({
      title: "Senior Engineer",
      company: "Acme Corp",
      url: "https://boards.greenhouse.io/example/jobs/1",
    });
    expect(body.criteriaName).toBe("Backend");
  });
});
