import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMockChrome } from "../../test/mock-chrome";
import {
  getSettings,
  getSyncState,
  setSettings,
  setSyncState,
} from "./storage";

beforeEach(() => {
  installMockChrome();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("settings", () => {
  it("returns defaults when nothing is stored", async () => {
    const settings = await getSettings();
    expect(settings).toEqual({
      apiBaseUrl: "http://localhost:3000",
      pat: null,
      llmProvider: null,
      llmApiKey: null,
      activeCriteriaId: null,
    });
  });

  it("merges a partial patch on top of the current settings", async () => {
    await setSettings({ pat: "jmc_pat_abc" });
    const settings = await setSettings({ llmProvider: "claude" });

    expect(settings.pat).toBe("jmc_pat_abc");
    expect(settings.llmProvider).toBe("claude");
    expect(settings.apiBaseUrl).toBe("http://localhost:3000");
  });

  it("persists across separate get calls", async () => {
    await setSettings({ apiBaseUrl: "https://jobmatch.example.com" });
    expect((await getSettings()).apiBaseUrl).toBe(
      "https://jobmatch.example.com",
    );
  });
});

describe("sync state", () => {
  it("returns defaults when nothing is stored", async () => {
    expect(await getSyncState()).toEqual({
      criteria: [],
      lastSyncedAt: null,
      lastSyncError: null,
    });
  });

  it("merges a partial patch on top of the current sync state", async () => {
    await setSyncState({ lastSyncError: "boom" });
    const state = await setSyncState({ lastSyncedAt: "2026-01-01T00:00:00Z" });

    expect(state.lastSyncError).toBe("boom");
    expect(state.lastSyncedAt).toBe("2026-01-01T00:00:00Z");
  });
});
