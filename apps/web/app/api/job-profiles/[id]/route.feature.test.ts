import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createTestUser, deleteTestUser } from "@/test/db";
import { jsonRequest } from "@/test/http";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";
import { validJobProfileInput } from "@/test/fixtures";

vi.mock("@/auth", () => mockAuthModule());

const { GET, PATCH, DELETE } = await import("./route");

function withParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

let userId: string;
let personId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
  mockSessionUser(userId);
  const person = await db.person.create({
    data: { userId, legalName: "Ada Lovelace", email: "ada@example.com" },
  });
  personId = person.id;
});

afterEach(async () => {
  await deleteTestUser(userId);
});

async function createJobProfile(overrides: Record<string, unknown> = {}) {
  return db.jobProfile.create({
    data: { personId, ...validJobProfileInput(overrides) },
  });
}

describe("GET /api/job-profiles/[id]", () => {
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

  it("404s (not 403) for another user's job profile", async () => {
    const otherUserId = (await createTestUser()).id;
    try {
      mockSessionUser(otherUserId);
      const otherPerson = await db.person.create({
        data: {
          userId: otherUserId,
          legalName: "Not Ada",
          email: "notada@example.com",
        },
      });
      const theirs = await db.jobProfile.create({
        data: { personId: otherPerson.id, ...validJobProfileInput() },
      });

      mockSessionUser(userId);
      const res = await GET(jsonRequest("http://x"), withParams(theirs.id));
      expect(res.status).toBe(404);
    } finally {
      await deleteTestUser(otherUserId);
    }
  });

  it("200s for an owned job profile", async () => {
    const profile = await createJobProfile({ jobTitle: "Mine" });
    const res = await GET(jsonRequest("http://x"), withParams(profile.id));
    expect(res.status).toBe(200);
    expect((await res.json()).jobTitle).toBe("Mine");
  });
});

describe("PATCH /api/job-profiles/[id]", () => {
  it("401s without a session", async () => {
    const profile = await createJobProfile();
    mockSessionUser(null);
    const res = await PATCH(
      jsonRequest("http://x", { method: "PATCH", body: { jobTitle: "New" } }),
      withParams(profile.id),
    );
    expect(res.status).toBe(401);
  });

  it("partially updates fields not included in the body", async () => {
    const profile = await createJobProfile({ jobTitle: "Original" });
    const res = await PATCH(
      jsonRequest("http://x", {
        method: "PATCH",
        body: { bio: "Builds things." },
      }),
      withParams(profile.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bio).toBe("Builds things.");
    expect(body.jobTitle).toBe("Original");
  });

  it("allows re-saving with the same jobTitle it already has", async () => {
    const profile = await createJobProfile({ jobTitle: "Original" });
    const res = await PATCH(
      jsonRequest("http://x", {
        method: "PATCH",
        body: { jobTitle: "Original", bio: "Still me." },
      }),
      withParams(profile.id),
    );
    expect(res.status).toBe(200);
  });

  it("400s when renaming to a jobTitle already used by another profile", async () => {
    await createJobProfile({ jobTitle: "Taken" });
    const profile = await createJobProfile({ jobTitle: "Original" });

    const res = await PATCH(
      jsonRequest("http://x", {
        method: "PATCH",
        body: { jobTitle: "Taken" },
      }),
      withParams(profile.id),
    );
    expect(res.status).toBe(400);
  });

  it("unsets isDefault on the other job profiles, not itself, when set true", async () => {
    const a = await createJobProfile({ jobTitle: "A", isDefault: true });
    const b = await createJobProfile({ jobTitle: "B" });

    const res = await PATCH(
      jsonRequest("http://x", { method: "PATCH", body: { isDefault: true } }),
      withParams(b.id),
    );
    expect((await res.json()).isDefault).toBe(true);

    const aAfter = await db.jobProfile.findUniqueOrThrow({
      where: { id: a.id },
    });
    expect(aAfter.isDefault).toBe(false);
  });

  it("404s for another user's job profile", async () => {
    const otherUserId = (await createTestUser()).id;
    try {
      mockSessionUser(otherUserId);
      const otherPerson = await db.person.create({
        data: {
          userId: otherUserId,
          legalName: "Not Ada",
          email: "notada@example.com",
        },
      });
      const theirs = await db.jobProfile.create({
        data: { personId: otherPerson.id, ...validJobProfileInput() },
      });

      mockSessionUser(userId);
      const res = await PATCH(
        jsonRequest("http://x", {
          method: "PATCH",
          body: { jobTitle: "hijack" },
        }),
        withParams(theirs.id),
      );
      expect(res.status).toBe(404);
    } finally {
      await deleteTestUser(otherUserId);
    }
  });
});

describe("DELETE /api/job-profiles/[id]", () => {
  it("401s without a session", async () => {
    const profile = await createJobProfile();
    mockSessionUser(null);
    const res = await DELETE(
      jsonRequest("http://x", { method: "DELETE" }),
      withParams(profile.id),
    );
    expect(res.status).toBe(401);
  });

  it("deletes an owned job profile", async () => {
    const profile = await createJobProfile();
    const res = await DELETE(
      jsonRequest("http://x", { method: "DELETE" }),
      withParams(profile.id),
    );
    expect(res.status).toBe(204);

    await expect(
      db.jobProfile.findUniqueOrThrow({ where: { id: profile.id } }),
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
