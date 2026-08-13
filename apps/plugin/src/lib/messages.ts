import type { DetectedJob } from "./host-registry";

// The single message contract between content.ts (page context, no direct
// API access) and background.ts (holds the PAT/LLM key, does the fetch).
// Content only ever reports what it found — background owns everything
// after that (checkSeen/vetJob, tab-state, the toolbar badge), so this is
// fire-and-forget, not request/response.
export type BackgroundMessage =
  | { type: "sync-now" }
  | { type: "job-detected"; job: DetectedJob & { jobUrl: string } }
  | { type: "pat-detected"; pat: string }
  | { type: "vetting-toggled"; enabled: boolean };

// The reverse direction: background asking a specific tab's content
// script to (re-)scan, e.g. right after vetting is switched back on for a
// job page that's already open (see rescanActiveTabIfNeeded in
// background.ts) — sent via chrome.tabs.sendMessage(tabId, ...), not the
// broadcast chrome.runtime.sendMessage used for BackgroundMessage.
export type ContentMessage = { type: "rescan" };
