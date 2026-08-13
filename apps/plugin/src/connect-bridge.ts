import type { BackgroundMessage } from "./lib/messages";

// Runs only on the Web App's own /connect page (manifest content_scripts
// match, scoped to WEB_APP_URL). Picks up the PAT the page writes to its
// own localStorage on token generation and relays it to background, so
// the popup never needs a manual copy-paste.
const PAT_STORAGE_KEY = "jobmatch:pat";

// Temporary, verbose on purpose: tracing the connect handoff while
// diagnosing why the Plugin sometimes doesn't pick up an auto-generated
// token. If this file's very first log line never shows up in the page's
// console, the content script isn't injected at all (stale extension
// build/reload, or the tab predates the reload — see the "load" log below).
const LOG = "[jobmatch:connect-bridge]";

console.log(LOG, "content script loaded on", location.href);

function relayPatIfPresent(source: string) {
  const pat = localStorage.getItem(PAT_STORAGE_KEY);
  if (!pat) {
    console.log(LOG, `${source}: no PAT in localStorage["${PAT_STORAGE_KEY}"]`);
    return;
  }

  console.log(
    LOG,
    `${source}: found PAT (${pat.slice(0, 12)}…), relaying to background`,
  );
  chrome.runtime.sendMessage({
    type: "pat-detected",
    pat,
  } satisfies BackgroundMessage);
  console.log(LOG, `${source}: sendMessage("pat-detected") dispatched`);
}

relayPatIfPresent("initial load");

// Catches a token generated after this content script already ran (the
// page writes localStorage then posts this message, since a same-document
// localStorage write doesn't fire a "storage" event in that same document).
window.addEventListener("message", (event) => {
  if (event.source !== window) {
    console.log(LOG, "message event ignored: wrong source");
    return;
  }
  if (event.origin !== location.origin) {
    console.log(
      LOG,
      `message event ignored: origin mismatch (${event.origin})`,
    );
    return;
  }
  if (event.data?.source !== "jobmatch-web") {
    console.log(
      LOG,
      "message event ignored: not from jobmatch-web",
      event.data,
    );
    return;
  }
  if (event.data?.type !== "pat-available") {
    console.log(LOG, "message event ignored: unexpected type", event.data);
    return;
  }

  console.log(LOG, "received pat-available message");
  relayPatIfPresent("pat-available message");
});
