import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { generatePersonalAccessToken } from "@/lib/auth/pat";
import { createTestUser, deleteTestUser } from "@/test/db";
import { jsonRequest, bearer } from "@/test/http";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";

vi.mock("@/auth", () => mockAuthModule());

const { GET, PUT } = await import("./route");

const URL = "http://localhost/api/profile";

let userId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("GET /api/profile", () => {
  it("401s without a session or PAT", async () => {
    mockSessionUser(null);
    const res = await GET(jsonRequest(URL));
    expect(res.status).toBe(401);
  });

  it("404s when the user has no profile yet", async () => {
    mockSessionUser(userId);
    const res = await GET(jsonRequest(URL));
    expect(res.status).toBe(404);
  });

  it("200s via PAT auth (Plugin autofill path)", async () => {
    mockSessionUser(null);
    await db.profile.create({
      data: { userId, legalName: "Ada Lovelace", email: "ada@example.com" },
    });
    const { token, tokenHash } = generatePersonalAccessToken();
    await db.personalAccessToken.create({
      data: { userId, name: "plugin", tokenHash },
    });

    const res = await GET(jsonRequest(URL, { headers: bearer(token) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.legalName).toBe("Ada Lovelace");
  });
});

describe("PUT /api/profile", () => {
  it("401s without a session", async () => {
    mockSessionUser(null);
    const res = await PUT(
      jsonRequest(URL, {
        method: "PUT",
        body: { legalName: "Ada", email: "ada@example.com" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("creates the profile on first PUT and applies schema defaults", async () => {
    mockSessionUser(userId);
    const res = await PUT(
      jsonRequest(URL, {
        method: "PUT",
        body: { legalName: "Ada Lovelace", email: "ada@example.com" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.legalName).toBe("Ada Lovelace");
    expect(body.parsedSkills).toEqual([]);
    expect(body.autofillAliases).toEqual({});
  });

  it("replaces the whole row on a second PUT", async () => {
    mockSessionUser(userId);
    await PUT(
      jsonRequest(URL, {
        method: "PUT",
        body: {
          legalName: "Ada Lovelace",
          email: "ada@example.com",
          parsedSkills: ["Math"],
        },
      }),
    );

    const res = await PUT(
      jsonRequest(URL, {
        method: "PUT",
        body: { legalName: "Ada King", email: "ada@example.com" },
      }),
    );
    const body = await res.json();
    expect(body.legalName).toBe("Ada King");
    // Not sent this time — full-replace semantics reset it to the default.
    expect(body.parsedSkills).toEqual([]);
  });

  it("400s on an invalid body", async () => {
    mockSessionUser(userId);
    const res = await PUT(
      jsonRequest(URL, {
        method: "PUT",
        body: { email: "not-an-email" },
      }),
    );
    expect(res.status).toBe(400);
  });
});
