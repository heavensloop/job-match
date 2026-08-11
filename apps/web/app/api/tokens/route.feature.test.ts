import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestUser, deleteTestUser } from "@/test/db";
import { jsonRequest } from "@/test/http";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";

vi.mock("@/auth", () => mockAuthModule());

const { GET, POST } = await import("./route");

const URL = "http://localhost/api/tokens";

let userId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("GET /api/tokens", () => {
  it("401s without a session", async () => {
    mockSessionUser(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("lists tokens without ever including the plaintext token or hash", async () => {
    mockSessionUser(userId);
    await POST(jsonRequest(URL, { method: "POST", body: { name: "laptop" } }));

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tokens).toHaveLength(1);
    expect(body.tokens[0].name).toBe("laptop");
    expect(body.tokens[0]).not.toHaveProperty("token");
    expect(body.tokens[0]).not.toHaveProperty("tokenHash");
  });

  it("only lists the current user's tokens", async () => {
    const otherUserId = (await createTestUser()).id;
    try {
      mockSessionUser(otherUserId);
      await POST(
        jsonRequest(URL, { method: "POST", body: { name: "someone else's" } }),
      );

      mockSessionUser(userId);
      const res = await GET();
      const body = await res.json();
      expect(body.tokens).toHaveLength(0);
    } finally {
      await deleteTestUser(otherUserId);
    }
  });
});

describe("POST /api/tokens", () => {
  it("401s without a session", async () => {
    mockSessionUser(null);
    const res = await POST(
      jsonRequest(URL, { method: "POST", body: { name: "x" } }),
    );
    expect(res.status).toBe(401);
  });

  it("creates a token and returns the plaintext exactly once", async () => {
    mockSessionUser(userId);
    const res = await POST(
      jsonRequest(URL, { method: "POST", body: { name: "laptop" } }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toMatch(/^jmc_pat_/);
    expect(body.name).toBe("laptop");
  });

  it("400s on an invalid body", async () => {
    mockSessionUser(userId);
    const res = await POST(
      jsonRequest(URL, { method: "POST", body: { name: "" } }),
    );
    expect(res.status).toBe(400);
  });
});
