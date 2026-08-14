import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { generatePersonalAccessToken } from "@/lib/auth/pat";
import { createTestUser, deleteTestUser } from "@/test/db";
import { jsonRequest, bearer } from "@/test/http";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";

vi.mock("@/auth", () => mockAuthModule());

const { GET, PUT } = await import("./route");

const URL = "http://localhost/api/person";

let userId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("GET /api/person", () => {
  it("401s without a session or PAT", async () => {
    mockSessionUser(null);
    const res = await GET(jsonRequest(URL));
    expect(res.status).toBe(401);
  });

  it("404s when the user has no person record yet", async () => {
    mockSessionUser(userId);
    const res = await GET(jsonRequest(URL));
    expect(res.status).toBe(404);
  });

  it("200s via PAT auth (Plugin autofill path)", async () => {
    mockSessionUser(null);
    await db.person.create({
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

describe("PUT /api/person", () => {
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

  it("creates the person on first PUT and applies schema defaults", async () => {
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
  });

  it("updates only the fields sent on a subsequent PUT", async () => {
    mockSessionUser(userId);
    await PUT(
      jsonRequest(URL, {
        method: "PUT",
        body: {
          legalName: "Ada Lovelace",
          email: "ada@example.com",
          phone: "+1-555-0100",
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
    // Omitted this time — Prisma's update() treats an absent/undefined
    // key as "leave unchanged," not "clear it" (unlike the array fields
    // on JobProfile, which have real Zod .default()s that always supply
    // a concrete value to write).
    expect(body.phone).toBe("+1-555-0100");
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
