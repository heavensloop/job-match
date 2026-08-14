import { runSync } from "./lib/sync";
import { checkSeen, vetJob } from "./lib/vet-client";
import { clearTabState, setTabState } from "./lib/tab-state";
import { setActionIcon } from "./lib/action-icon";
import { setSettings } from "./lib/storage";
import type { BackgroundMessage } from "./lib/messages";

const MANUAL_VET_SCRIPT = "manual-vet.js";

const SYNC_ALARM = "jobmatch-sync";
const SYNC_INTERVAL_MINUTES = 15;

// Temporary, verbose on purpose: tracing the connect handoff while
// diagnosing why the Plugin sometimes doesn't pick up an auto-generated
// token. Check this in chrome://extensions -> JobMatch Copilot ->
// "Inspect views service worker" -> Console.
const LOG = "[jobmatch:background]";
console.log(LOG, "service worker started");

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_INTERVAL_MINUTES });
  void runSync();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) void runSync();
});

// Placeholder job + an error vetResult, reusing the exact same tab-state
// shape/rendering path handleJobDetected's failures already use — so the
// popup needs no separate error-display code for this case.
async function writeManualVetError(
  tabId: number,
  title: string,
  jobUrl: string,
  reason: string,
) {
  await setTabState(tabId, {
    job: {
      title: title || "This page",
      company: "",
      descriptionText: "",
      jobUrl,
    },
    status: "error",
    vetResult: { ok: false, error: reason },
  });
  await setActionIcon(tabId, "error");
}

// Triggered by the popup's "Vet Page" button. Injects manual-vet.js into
// whatever tab is active — activeTab permission covers this since it's a
// direct result of the user clicking something in the extension UI — which
// then reports back via the same "job-detected"/"manual-vet-failed"
// messages content.ts and manual-vet.ts itself send.
async function handleVetActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [MANUAL_VET_SCRIPT],
    });
  } catch (err) {
    await writeManualVetError(
      tab.id,
      tab.title ?? "",
      tab.url ?? "",
      err instanceof Error
        ? `Can't read this page: ${err.message}`
        : "Can't read this page.",
    );
  }
}

async function handleJobDetected(
  tabId: number,
  job: Extract<BackgroundMessage, { type: "job-detected" }>["job"],
) {
  await setTabState(tabId, { job, status: "checking" });
  await setActionIcon(tabId, "checking");

  // checkSeen before vetJob, not in parallel: vetJob's own jobs_seen
  // upsert would otherwise make a genuine first-ever view look
  // "seen today" if checkSeen read the row after vetJob just created it.
  const seenResult = await checkSeen(job.jobUrl);
  const vetResult = await vetJob(job);

  await setTabState(tabId, {
    status: vetResult.ok ? "ready" : "error",
    vetResult,
    seenResult,
  });
  await setActionIcon(
    tabId,
    vetResult.ok ? "ready" : "error",
    vetResult.ok ? String(vetResult.draft.vettingSnapshot.score) : undefined,
  );
}

// The content script has no direct API access (no PAT/LLM key in the page
// context) — it messages the background service worker, which owns the
// PAT/key and does the actual fetch.
chrome.runtime.onMessage.addListener((message: BackgroundMessage, sender) => {
  console.log(
    LOG,
    "onMessage:",
    message?.type,
    "from",
    sender.tab?.url ?? "popup",
  );
  if (message?.type === "sync-now") {
    void runSync();
    return;
  }
  if (message?.type === "job-detected") {
    const tabId = sender.tab?.id;
    if (tabId !== undefined) void handleJobDetected(tabId, message.job);
    return;
  }
  if (message?.type === "pat-detected") {
    console.log(
      LOG,
      `pat-detected: saving PAT (${message.pat.slice(0, 12)}…) to settings`,
    );
    setSettings({ pat: message.pat })
      .then((settings) => {
        console.log(
          LOG,
          "pat-detected: settings saved, pat is now",
          settings.pat ? "set" : "null",
        );
        // Without this, a freshly-connected Plugin has no search criteria
        // until the next 15-minute alarm or a manual "Sync now" — the
        // active-criteria dropdown in the popup would just show "— none
        // synced yet —" right after login.
        return runSync();
      })
      .catch((err: unknown) =>
        console.error(LOG, "pat-detected: setSettings/sync failed", err),
      );
    return;
  }
  if (message?.type === "vet-active-tab") {
    void handleVetActiveTab();
    return;
  }
  if (message?.type === "manual-vet-failed") {
    const tab = sender.tab;
    if (tab?.id !== undefined) {
      void writeManualVetError(
        tab.id,
        tab.title ?? "",
        tab.url ?? "",
        message.reason,
      );
    }
    return;
  }
});

// Keep tab-state (and the toolbar badge) from outliving the page it came
// from — a closed tab's state is meaningless, and a fresh navigation
// should clear the previous page's job info rather than show it stale.
chrome.tabs.onRemoved.addListener((tabId) => {
  void clearTabState(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    void clearTabState(tabId);
    void setActionIcon(tabId, "none");
  }
});
