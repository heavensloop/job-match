import { detectJobLenient } from "./lib/host-registry";
import type { BackgroundMessage } from "./lib/messages";

// Injected on demand (chrome.scripting.executeScript) when the user clicks
// "Vet Page" in the popup — unlike content.ts, this isn't gated by
// manifest.json's content_scripts matches, so it runs on whatever page the
// user is currently looking at, job board or not.
function main() {
  const job = detectJobLenient(document);

  if (!job) {
    chrome.runtime.sendMessage({
      type: "manual-vet-failed",
      reason: "Couldn't find any job description text on this page.",
    } satisfies BackgroundMessage);
    return;
  }

  chrome.runtime.sendMessage({
    type: "job-detected",
    job: { ...job, jobUrl: location.href },
  } satisfies BackgroundMessage);
}

main();
