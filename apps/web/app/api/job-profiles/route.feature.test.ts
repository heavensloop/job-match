import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createTestUser, deleteTestUser } from "@/test/db";
import { jsonRequest } from "@/test/http";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";
import { validJobProfileInput } from "@/test/fixtures";

vi.mock("@/auth", () => mockAuthModule());

const { GET, POST } = await import("./route");

const URL = "http://localhost/api/job-profiles";

let userId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
  mockSessionUser(userId);
});

afterEach(async () => {
  await deleteTestUser(userId);
});

async function createPerson(forUserId: string = userId) {
  return db.person.create({
    data: {
      userId: forUserId,
      legalName: "Ada Lovelace",
      email: "ada@example.com",
    },
  });
}

describe("GET /api/job-profiles", () => {
  it("401s without a session or PAT", async () => {
    mockSessionUser(null);
    const res = await GET(jsonRequest(URL));
    expect(res.status).toBe(401);
  });

  it("returns an empty list when the user has no person record yet", async () => {
    const res = await GET(jsonRequest(URL));
    expect(res.status).toBe(200);
    expect((await res.json()).jobProfiles).toEqual([]);
  });

  it("lists only the current user's job profiles", async () => {
    await createPerson();
    await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validJobProfileInput({ jobTitle: "Mine" }),
      }),
    );

    const otherUserId = (await createTestUser()).id;
    try {
      mockSessionUser(otherUserId);
      await createPerson(otherUserId);
      await POST(
        jsonRequest(URL, {
          method: "POST",
          body: validJobProfileInput({ jobTitle: "Not mine" }),
        }),
      );

      mockSessionUser(userId);
      const res = await GET(jsonRequest(URL));
      const body = await res.json();
      expect(body.jobProfiles).toHaveLength(1);
      expect(body.jobProfiles[0].jobTitle).toBe("Mine");
    } finally {
      await deleteTestUser(otherUserId);
    }
  });
});

describe("POST /api/job-profiles", () => {
  it("401s without a session", async () => {
    mockSessionUser(null);
    const res = await POST(
      jsonRequest(URL, { method: "POST", body: validJobProfileInput() }),
    );
    expect(res.status).toBe(401);
  });

  it("400s when the user has no person record yet", async () => {
    const res = await POST(
      jsonRequest(URL, { method: "POST", body: validJobProfileInput() }),
    );
    expect(res.status).toBe(400);
  });

  it("creates a job profile with schema defaults applied", async () => {
    await createPerson();
    const res = await POST(
      jsonRequest(URL, { method: "POST", body: validJobProfileInput() }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.skills).toEqual([]);
    expect(body.experiences).toEqual([]);
    expect(body.education).toEqual([]);
  });

  it("automatically marks the first job profile as default", async () => {
    await createPerson();
    const res = await POST(
      jsonRequest(URL, { method: "POST", body: validJobProfileInput() }),
    );
    expect((await res.json()).isDefault).toBe(true);
  });

  it("does not default the second job profile unless asked", async () => {
    await createPerson();
    await POST(
      jsonRequest(URL, { method: "POST", body: validJobProfileInput() }),
    );

    const second = await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validJobProfileInput({ jobTitle: "Second" }),
      }),
    ).then((r) => r.json());
    expect(second.isDefault).toBe(false);
  });

  it("400s on an invalid body (missing jobTitle)", async () => {
    await createPerson();
    const res = await POST(jsonRequest(URL, { method: "POST", body: {} }));
    expect(res.status).toBe(400);
  });

  it("400s when creating a job profile with a jobTitle already in use", async () => {
    await createPerson();
    await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validJobProfileInput({ jobTitle: "Backend Engineering" }),
      }),
    );

    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validJobProfileInput({ jobTitle: "Backend Engineering" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("unsets isDefault on the other job profiles when creating a new default", async () => {
    await createPerson();
    const first = await POST(
      jsonRequest(URL, { method: "POST", body: validJobProfileInput() }),
    ).then((r) => r.json());
    expect(first.isDefault).toBe(true);

    const second = await POST(
      jsonRequest(URL, {
        method: "POST",
        body: validJobProfileInput({ jobTitle: "Second", isDefault: true }),
      }),
    ).then((r) => r.json());
    expect(second.isDefault).toBe(true);

    const list = await GET(jsonRequest(URL)).then((r) => r.json());
    const firstAfter = list.jobProfiles.find(
      (p: { id: string }) => p.id === first.id,
    );
    expect(firstAfter.isDefault).toBe(false);
  });
});
