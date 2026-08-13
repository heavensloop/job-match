import { renderCircleIcon, type RgbColor } from "./icon-image";

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

// The extension-wide base icon (no tabId, unlike the badge chip above) —
// reflects the vettingEnabled on/off toggle. No manifest default_icon is
// declared, so this is the only place the icon image comes from; there's
// a brief flash of Chrome's generic default right after install/browser
// restart until background.ts's onInstalled/onStartup calls this once.
const ICON_SIZES = [16, 32, 48, 128];
const ENABLED_COLOR: RgbColor = { r: 37, g: 99, b: 235 }; // #2563eb
const DISABLED_COLOR: RgbColor = { r: 158, g: 158, b: 158 }; // #9e9e9e, matches the "checking" badge gray

export async function setToggleIcon(enabled: boolean): Promise<void> {
  const color = enabled ? ENABLED_COLOR : DISABLED_COLOR;
  const imageData: Record<number, ImageData> = {};

  for (const size of ICON_SIZES) {
    imageData[size] = new ImageData(renderCircleIcon(size, color), size, size);
  }

  await chrome.action.setIcon({ imageData });
}
