// The toolbar icon's badge chip (not to be confused with the old in-page
// overlay badge, which this whole redesign removes) — a colored chip
// Chrome overlays on the extension icon's corner, same idiom as unread
// counts on ad blockers/Slack. No new image assets, no manifest changes.
export type ActionIconState = "none" | "checking" | "ready" | "error";

const COLOR: Record<Exclude<ActionIconState, "none">, string> = {
  checking: "#9e9e9e",
  ready: "#2ecc71",
  error: "#e67e22",
};

export async function setActionIcon(
  tabId: number,
  state: ActionIconState,
  scoreText?: string,
): Promise<void> {
  if (state === "none") {
    await chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }

  const text =
    state === "checking" ? "…" : state === "error" ? "!" : (scoreText ?? "");

  await Promise.all([
    chrome.action.setBadgeText({ tabId, text }),
    chrome.action.setBadgeBackgroundColor({ tabId, color: COLOR[state] }),
  ]);
}
