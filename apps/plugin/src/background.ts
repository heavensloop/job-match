import { runSync } from "./lib/sync";
import { checkSeen, vetJob } from "./lib/vet-client";
import { matchHost } from "./lib/host-registry";
import { clearTabState, getTabState, setTabState } from "./lib/tab-state";
import { setActionIcon, setToggleIcon } from "./lib/action-icon";
import { getSettings, setSettings } from "./lib/storage";
import type { BackgroundMessage, ContentMessage } from "./lib/messages";

const SYNC_ALARM = "jobmatch-sync";
const SYNC_INTERVAL_MINUTES = 15;

// Temporary, verbose on purpose: tracing the connect handoff while
// diagnosing why the Plugin sometimes doesn't pick up an auto-generated
// token. Check this in chrome://extensions -> JobMatch Copilot ->
// "Inspect views service worker" -> Console.
const LOG = "[jobmatch:background]";
console.log(LOG, "service worker started");

// No manifest default_icon is declared (see lib/action-icon.ts), so the
// toolbar icon only ever reflects reality once this has run at least
// once — on install and on every browser/service-worker restart.
async function applyStoredToggleIcon() {
  const settings = await getSettings();
  await setToggleIcon(settings.vettingEnabled);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_INTERVAL_MINUTES });
  void runSync();
  void applyStoredToggleIcon();
});

chrome.runtime.onStartup.addListener(() => {
  void applyStoredToggleIcon();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) void runSync();
});

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

// Turning vetting back on should behave "as if the page just loaded" for
// whatever job page is currently open, rather than waiting for the next
// navigation — but only if it hasn't already been scanned (or isn't
// mid-scan): if tab-state already exists, the popup is already showing
// that result as-is, and re-scanning would just waste a vetJob() call.
async function rescanActiveTabIfNeeded() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined || !tab.url || !matchHost(tab.url)) return;

  const existing = await getTabState(tab.id);
  if (existing) return;

  chrome.tabs
    .sendMessage(tab.id, {
      type: "rescan",
    } satisfies ContentMessage)
    .catch(() => {
      // Content script may not be ready yet, or the tab navigated away
      // between the query above and this call — safe to ignore, the next
      // real navigation scans normally regardless.
    });
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
  if (message?.type === "vetting-toggled") {
    void setToggleIcon(message.enabled);
    if (message.enabled) void rescanActiveTabIfNeeded();
    return;
  }
  if (message?.type === "pat-detected") {
    console.log(
      LOG,
      `pat-detected: saving PAT (${message.pat.slice(0, 12)}…) to settings`,
    );
    setSettings({ pat: message.pat })
      .then((settings) =>
        console.log(
          LOG,
          "pat-detected: settings saved, pat is now",
          settings.pat ? "set" : "null",
        ),
      )
      .catch((err: unknown) =>
        console.error(LOG, "pat-detected: setSettings failed", err),
      );
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
