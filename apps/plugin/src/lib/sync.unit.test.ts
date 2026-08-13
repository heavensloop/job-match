import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMockChrome } from "../../test/mock-chrome";
import { getSyncState, setSettings } from "./storage";
import { runSync } from "./sync";

const fetchMock = vi.fn();

beforeEach(() => {
  installMockChrome();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const validCriteria = {
  id: "8a2f6c9e-3f1a-4b2a-9c3d-1e2f3a4b5c6d",
  userId: "1a2b3c4d-5e6f-4789-abcd-ef0123456789",
  name: "Remote full-time",
  isDefault: true,
  workMode: ["remote"],
  scope: "global_remote",
  locations: [],
  employmentType: ["full_time"],
  currency: "USD",
  exclusions: { keywords: [], companies: [] },
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("runSync", () => {
  it("records an error and skips the request when there's no PAT", async () => {
    await runSync();

    expect(fetchMock).not.toHaveBeenCalled();
    const state = await getSyncState();
    expect(state.lastSyncError).toMatch(/no personal access token/i);
  });

  it("caches the criteria list on a successful sync", async () => {
    await setSettings({ pat: "jmc_pat_abc" });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ searchCriteria: [validCriteria] }), {
        status: 200,
      }),
    );

    await runSync();

    const state = await getSyncState();
    expect(state.lastSyncError).toBeNull();
    expect(state.criteria).toHaveLength(1);
    expect(state.criteria[0].name).toBe("Remote full-time");
    expect(state.lastSyncedAt).not.toBeNull();
  });

  it("records an error on a non-ok response", async () => {
    await setSettings({ pat: "jmc_pat_revoked" });
    fetchMock.mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    await runSync();

    const state = await getSyncState();
    expect(state.lastSyncError).toMatch(/401/);
  });

  it("records an error when the response doesn't match SearchCriteriaSchema", async () => {
    await setSettings({ pat: "jmc_pat_abc" });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ searchCriteria: [{ bogus: true }] }), {
        status: 200,
      }),
    );

    await runSync();

    const state = await getSyncState();
    expect(state.lastSyncError).not.toBeNull();
    expect(state.criteria).toEqual([]);
  });
});
