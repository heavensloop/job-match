import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMockChrome } from "../../test/mock-chrome";
import { setSettings } from "./storage";
import { checkSeen, vetJob } from "./vet-client";

const fetchMock = vi.fn();

beforeEach(() => {
  installMockChrome();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const job = {
  title: "Senior Engineer",
  company: "Acme Corp",
  descriptionText: "We need someone who loves difference engines.",
  jobUrl: "https://boards.greenhouse.io/acme/jobs/1",
};

const validDraft = {
  id: "8a2f6c9e-3f1a-4b2a-9c3d-1e2f3a4b5c6d",
  userId: "1a2b3c4d-5e6f-4789-abcd-ef0123456789",
  jobId: "2a2b3c4d-5e6f-4789-abcd-ef0123456789",
  criteriaId: "3a2b3c4d-5e6f-4789-abcd-ef0123456789",
  vettingSnapshot: {
    score: 82,
    recommendation: "strong_match",
    summary: "Good overlap on skills.",
    strengths: [],
    gaps: [],
  },
  autofillFieldMap: {},
  userEdits: {},
  status: "reviewed",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("vetJob", () => {
  it("errors without a PAT", async () => {
    const result = await vetJob(job);
    expect(result).toEqual({
      ok: false,
      error: "No personal access token configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("errors without an LLM provider/key", async () => {
    await setSettings({ pat: "jmc_pat_abc" });
    const result = await vetJob(job);
    expect(result).toEqual({
      ok: false,
      error: "No LLM provider/key configured",
    });
  });

  it("errors without an active search criteria", async () => {
    await setSettings({
      pat: "jmc_pat_abc",
      llmProvider: "claude",
      llmApiKey: "sk-test",
    });
    const result = await vetJob(job);
    expect(result).toEqual({
      ok: false,
      error: "No active search criteria selected",
    });
  });

  it("posts to /api/vet with PAT and LLM headers, returning the draft", async () => {
    await setSettings({
      pat: "jmc_pat_abc",
      llmProvider: "claude",
      llmApiKey: "sk-test",
      activeCriteriaId: "3a2b3c4d-5e6f-4789-abcd-ef0123456789",
    });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(validDraft), { status: 200 }),
    );

    const result = await vetJob(job);

    expect(result).toEqual({
      ok: true,
      draft: {
        ...validDraft,
        createdAt: new Date(validDraft.createdAt),
        updatedAt: new Date(validDraft.updatedAt),
      },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/vet");
    expect(init.headers.authorization).toBe("Bearer jmc_pat_abc");
    expect(init.headers["x-llm-provider"]).toBe("claude");
    expect(init.headers["x-llm-api-key"]).toBe("sk-test");
    expect(JSON.parse(init.body)).toEqual({
      jobUrl: job.jobUrl,
      jobTitle: job.title,
      company: job.company,
      jobDescriptionText: job.descriptionText,
      criteriaId: "3a2b3c4d-5e6f-4789-abcd-ef0123456789",
    });
  });

  it("surfaces the server's error message on a non-ok response", async () => {
    await setSettings({
      pat: "jmc_pat_abc",
      llmProvider: "claude",
      llmApiKey: "sk-test",
      activeCriteriaId: "3a2b3c4d-5e6f-4789-abcd-ef0123456789",
    });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "LLM response did not match" }), {
        status: 502,
      }),
    );

    const result = await vetJob(job);
    expect(result).toEqual({
      ok: false,
      error: "LLM response did not match",
    });
  });
});

describe("checkSeen", () => {
  it("errors without a PAT", async () => {
    const result = await checkSeen(job.jobUrl);
    expect(result).toEqual({
      ok: false,
      error: "No personal access token configured",
    });
  });

  it("returns firstSeenAt from the jobs-seen endpoint", async () => {
    await setSettings({ pat: "jmc_pat_abc" });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ firstSeenAt: "2026-01-01T00:00:00.000Z" }),
        {
          status: 200,
        },
      ),
    );

    const result = await checkSeen(job.jobUrl);

    expect(result).toEqual({
      ok: true,
      firstSeenAt: "2026-01-01T00:00:00.000Z",
    });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "http://localhost:3000/api/jobs-seen?url=" +
        encodeURIComponent(job.jobUrl),
    );
  });

  it("returns an error on a non-ok response", async () => {
    await setSettings({ pat: "jmc_pat_abc" });
    fetchMock.mockResolvedValue(new Response("nope", { status: 401 }));

    const result = await checkSeen(job.jobUrl);
    expect(result).toEqual({ ok: false, error: "HTTP 401" });
  });
});
