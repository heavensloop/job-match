import { z } from "zod";
import { SearchCriteriaSchema } from "@jobmatch/shared";
import { apiFetch } from "./api-client";
import { getSettings, setSyncState } from "./storage";

// Periodically refreshes the cached criteria-set list (via the PAT) so the
// popup's picker has data without hitting the network on open, and so a
// revoked/invalid PAT surfaces as a visible sync error rather than a
// silent failure the next time something needs criteria.
export async function runSync(): Promise<void> {
  const settings = await getSettings();

  if (!settings.pat) {
    await setSyncState({
      lastSyncError: "No personal access token configured",
    });
    return;
  }

  try {
    const res = await apiFetch("/api/search-criteria", {
      apiBaseUrl: settings.apiBaseUrl,
      pat: settings.pat,
    });

    if (!res.ok) {
      throw new Error(`Sync failed: HTTP ${res.status}`);
    }

    const body = await res.json();
    const criteria = z.array(SearchCriteriaSchema).parse(body.searchCriteria);

    await setSyncState({
      criteria,
      lastSyncedAt: new Date().toISOString(),
      lastSyncError: null,
    });
  } catch (error) {
    await setSyncState({
      lastSyncError: error instanceof Error ? error.message : String(error),
    });
  }
}
