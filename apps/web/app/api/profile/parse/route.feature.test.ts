import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestUser, deleteTestUser } from "@/test/db";
import { jsonRequest, llmHeaders } from "@/test/http";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";
import {
  completeMock,
  mockLlmJsonResponse,
  mockLlmModule,
  mockLlmTextResponse,
} from "@/test/mock-llm";

vi.mock("@/auth", () => mockAuthModule());
vi.mock("@/lib/llm/get-provider", () => mockLlmModule());

const { POST } = await import("./route");

const URL = "http://localhost/api/profile/parse";

let userId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
  mockSessionUser(userId);
  completeMock.mockReset();
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("POST /api/profile/parse", () => {
  it("401s without a session", async () => {
    mockSessionUser(null);
    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: { text: "resume text" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("400s when the LLM headers are missing", async () => {
    const res = await POST(
      jsonRequest(URL, { method: "POST", body: { text: "resume text" } }),
    );
    expect(res.status).toBe(400);
  });

  it("400s on an empty body", async () => {
    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: { text: "" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns the structured parse from the LLM", async () => {
    mockLlmJsonResponse({
      legalName: "Ada Lovelace",
      skills: ["Math", "Analytical Engines"],
      yearsOfExperience: 12,
    });

    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: { text: "Ada Lovelace's resume..." },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.legalName).toBe("Ada Lovelace");
    expect(body.skills).toEqual(["Math", "Analytical Engines"]);
    expect(body.yearsOfExperience).toBe(12);
    expect(completeMock).toHaveBeenCalledTimes(1);
  });

  it("fills in defaults for fields the LLM omitted", async () => {
    mockLlmJsonResponse({ legalName: "Ada Lovelace" });

    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: { text: "short resume" },
      }),
    );
    const body = await res.json();
    expect(body.skills).toEqual([]);
    expect(body.experiences).toEqual([]);
  });

  it("502s when the LLM response isn't valid JSON", async () => {
    mockLlmTextResponse("not json");
    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: { text: "resume text" },
      }),
    );
    expect(res.status).toBe(502);
  });

  it("502s when the LLM's JSON doesn't match the expected shape", async () => {
    mockLlmJsonResponse({ yearsOfExperience: "a lot" });
    const res = await POST(
      jsonRequest(URL, {
        method: "POST",
        headers: llmHeaders(),
        body: { text: "resume text" },
      }),
    );
    expect(res.status).toBe(502);
  });
});
