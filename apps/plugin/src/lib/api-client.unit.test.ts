import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api-client";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("joins the base URL and path, adding the Bearer auth header", async () => {
    await apiFetch("/api/search-criteria", {
      apiBaseUrl: "http://localhost:3000",
      pat: "jmc_pat_abc",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/search-criteria");
    expect(init.headers.authorization).toBe("Bearer jmc_pat_abc");
  });

  it("preserves caller-provided init options and headers", async () => {
    await apiFetch("/api/vet", {
      apiBaseUrl: "http://localhost:3000",
      pat: "jmc_pat_abc",
      init: {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(init.headers.authorization).toBe("Bearer jmc_pat_abc");
    expect(init.body).toBe("{}");
  });
});
