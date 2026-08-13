import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMockChrome } from "../../test/mock-chrome";
import { clearTabState, getTabState, setTabState } from "./tab-state";

beforeEach(() => {
  installMockChrome();
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

describe("getTabState", () => {
  it("returns null when nothing is stored for the tab", async () => {
    expect(await getTabState(1)).toBeNull();
  });

  it("keeps different tabs' state independent", async () => {
    await setTabState(1, { job, status: "checking" });
    expect(await getTabState(2)).toBeNull();
    expect((await getTabState(1))?.status).toBe("checking");
  });
});

describe("setTabState", () => {
  it("sets the initial state for a tab", async () => {
    const state = await setTabState(1, { job, status: "checking" });
    expect(state).toEqual({ job, status: "checking" });
  });

  it("merges a patch on top of the existing entry", async () => {
    await setTabState(1, { job, status: "checking" });
    const state = await setTabState(1, {
      status: "ready",
      vetResult: { ok: true, draft: { id: "draft-1" } as never },
    });

    expect(state.job).toEqual(job);
    expect(state.status).toBe("ready");
    expect(state.vetResult).toEqual({ ok: true, draft: { id: "draft-1" } });
  });
});

describe("clearTabState", () => {
  it("removes the entry for that tab only", async () => {
    await setTabState(1, { job, status: "checking" });
    await setTabState(2, { job, status: "checking" });

    await clearTabState(1);

    expect(await getTabState(1)).toBeNull();
    expect(await getTabState(2)).not.toBeNull();
  });
});
