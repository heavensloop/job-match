import { runSync } from "./lib/sync";

const SYNC_ALARM = "jobmatch-sync";
const SYNC_INTERVAL_MINUTES = 15;

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_INTERVAL_MINUTES });
  void runSync();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) void runSync();
});

// The popup's "Sync now" button and settings form both trigger an
// immediate sync via this message rather than waiting for the next alarm.
chrome.runtime.onMessage.addListener((message: { type?: string }) => {
  if (message?.type === "sync-now") {
    void runSync();
  }
});
