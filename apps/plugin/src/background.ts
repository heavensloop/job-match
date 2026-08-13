import { runSync } from "./lib/sync";
import { checkSeen, vetJob } from "./lib/vet-client";
import type { BackgroundMessage } from "./lib/messages";

const SYNC_ALARM = "jobmatch-sync";
const SYNC_INTERVAL_MINUTES = 15;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_INTERVAL_MINUTES });
  void runSync();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) void runSync();
});

// The content script has no direct API access (no PAT/LLM key in the page
// context) — it messages the background service worker for both the
// "sync-now" fire-and-forget case and the request/response vet-job /
// check-seen calls the badge (§5.2) needs.
chrome.runtime.onMessage.addListener(
  (message: BackgroundMessage, _sender, sendResponse) => {
    if (message?.type === "sync-now") {
      void runSync();
      return;
    }
    if (message?.type === "vet-job") {
      void vetJob(message.job).then(sendResponse);
      return true;
    }
    if (message?.type === "check-seen") {
      void checkSeen(message.jobUrl).then(sendResponse);
      return true;
    }
  },
);
