import type { LlmProviderId, SearchCriteria } from "@jobmatch/shared";

// Everything here is chrome.storage.local only — never synced to Postgres
// (decisions #6/#18: active criteria selection and the LLM key are local
// UI state / never persisted server-side).
export interface PluginSettings {
  apiBaseUrl: string;
  pat: string | null;
  llmProvider: LlmProviderId | null;
  llmApiKey: string | null;
  activeCriteriaId: string | null;
}

export interface SyncState {
  criteria: SearchCriteria[];
  lastSyncedAt: string | null; // ISO timestamp
  lastSyncError: string | null;
}

const DEFAULT_SETTINGS: PluginSettings = {
  apiBaseUrl: "http://localhost:3000",
  pat: null,
  llmProvider: null,
  llmApiKey: null,
  activeCriteriaId: null,
};

const DEFAULT_SYNC_STATE: SyncState = {
  criteria: [],
  lastSyncedAt: null,
  lastSyncError: null,
};

const SETTINGS_KEY = "settings";
const SYNC_STATE_KEY = "syncState";

export async function getSettings(): Promise<PluginSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...(stored[SETTINGS_KEY] as Partial<PluginSettings> | undefined),
  };
}

export async function setSettings(
  patch: Partial<PluginSettings>,
): Promise<PluginSettings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function getSyncState(): Promise<SyncState> {
  const stored = await chrome.storage.local.get(SYNC_STATE_KEY);
  return {
    ...DEFAULT_SYNC_STATE,
    ...(stored[SYNC_STATE_KEY] as Partial<SyncState> | undefined),
  };
}

export async function setSyncState(
  patch: Partial<SyncState>,
): Promise<SyncState> {
  const next = { ...(await getSyncState()), ...patch };
  await chrome.storage.local.set({ [SYNC_STATE_KEY]: next });
  return next;
}
