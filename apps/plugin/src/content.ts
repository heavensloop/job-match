import { detectJob, matchHost } from "./lib/host-registry";
import type { BackgroundMessage } from "./lib/messages";

// Detection only — everything after this (checkSeen/vetJob, tab-state, the
// toolbar badge) lives in background.ts. No DOM writes to the host page:
// the score/gap/"seen before" info lives in the popup, not an in-page
// overlay (that overlay was a real source of bugs — CSS/z-index/DOM-timing
// interference from the host page — that a page-native popup can't have).
function main() {
  if (!matchHost(location.href)) return;

  const job = detectJob(document);
  if (!job) return;

  chrome.runtime.sendMessage({
    type: "job-detected",
    job: { ...job, jobUrl: location.href },
  } satisfies BackgroundMessage);
}

main();
