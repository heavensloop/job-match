import { detectJob, matchHost } from "./lib/host-registry";
import { getSettings } from "./lib/storage";
import type { BackgroundMessage, ContentMessage } from "./lib/messages";

// Detection only — everything after this (checkSeen/vetJob, tab-state, the
// toolbar badge) lives in background.ts. No DOM writes to the host page:
// the score/gap/"seen before" info lives in the popup, not an in-page
// overlay (that overlay was a real source of bugs — CSS/z-index/DOM-timing
// interference from the host page — that a page-native popup can't have).
function scanPage() {
  const job = detectJob(document);
  if (!job) return;

  chrome.runtime.sendMessage({
    type: "job-detected",
    job: { ...job, jobUrl: location.href },
  } satisfies BackgroundMessage);
}

async function main() {
  if (!matchHost(location.href)) return;

  // The vettingEnabled toggle's actual enforcement point: when off, this
  // is the only work the content script does — no DOM read, no message.
  const settings = await getSettings();
  if (!settings.vettingEnabled) return;

  scanPage();
}

void main();

// Lets background.ts ask for a fresh scan without a page reload — used
// when vetting is switched back on for a job page that's already open,
// so it behaves "as if the page just loaded" (see rescanActiveTabIfNeeded
// in background.ts) instead of waiting for the next navigation.
chrome.runtime.onMessage.addListener((message: ContentMessage) => {
  if (message?.type === "rescan") scanPage();
});
