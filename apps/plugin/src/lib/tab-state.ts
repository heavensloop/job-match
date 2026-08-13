import type { DetectedJob } from "./host-registry";
import type { CheckSeenResult, VetJobResult } from "./vet-client";

// chrome.storage.session, not .local or an in-memory Map — this needs to
// survive the MV3 service worker being killed and restarted (which an
// in-memory Map wouldn't), but should NOT persist across browser restarts
// like .local would (a stale "ready" score from last week is worse than no
// score at all). Keyed per-tab so the popup can look up "what's the state
// for the tab I'm currently looking at."
export interface TabJobState {
  job: DetectedJob & { jobUrl: string };
  status: "checking" | "ready" | "error";
  vetResult?: VetJobResult;
  seenResult?: CheckSeenResult;
}

function tabStateKey(tabId: number): string {
  return `tabState:${tabId}`;
}

export async function getTabState(tabId: number): Promise<TabJobState | null> {
  const key = tabStateKey(tabId);
  const stored = await chrome.storage.session.get(key);
  return (stored[key] as TabJobState | undefined) ?? null;
}

// The first call for a tab must include `job` and `status` — there's no
// prior entry to patch on top of yet.
export async function setTabState(
  tabId: number,
  patch: Partial<TabJobState>,
): Promise<TabJobState> {
  const current = await getTabState(tabId);
  const next = { ...current, ...patch } as TabJobState;
  await chrome.storage.session.set({ [tabStateKey(tabId)]: next });
  return next;
}

export async function clearTabState(tabId: number): Promise<void> {
  await chrome.storage.session.remove(tabStateKey(tabId));
}
