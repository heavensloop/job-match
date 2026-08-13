import type { Gap } from "@jobmatch/shared";
import { detectJob, matchHost } from "./lib/host-registry";
import type { BackgroundMessage } from "./lib/messages";
import type { CheckSeenResult, VetJobResult } from "./lib/vet-client";

const BADGE_HOST_ID = "jobmatch-copilot-badge-host";

function topGap(gaps: Gap[]): Gap | undefined {
  return gaps.find((gap) => gap.severity === "high") ?? gaps[0];
}

function createBadge(): {
  label: HTMLSpanElement;
  badge: HTMLDivElement;
  tooltip: HTMLDivElement;
} {
  const host = document.createElement("div");
  host.id = BADGE_HOST_ID;
  Object.assign(host.style, {
    all: "initial",
    position: "fixed",
    bottom: "16px",
    right: "16px",
    zIndex: "2147483647",
  });

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    .badge {
      font-family: system-ui, sans-serif;
      font-size: 13px;
      background: #1a1a2e;
      color: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      position: relative;
    }
    .badge.error { background: #5c1a1a; }
    .tooltip {
      display: none;
      position: absolute;
      bottom: calc(100% + 6px);
      right: 0;
      background: #000;
      color: #fff;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
    }
    .badge:hover .tooltip.has-content { display: block; }
  `;

  const badge = document.createElement("div");
  badge.className = "badge";

  const label = document.createElement("span");
  label.textContent = "Checking match…";

  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";

  badge.append(label, tooltip);
  shadow.append(style, badge);
  document.documentElement.appendChild(host);

  return { label, badge, tooltip };
}

async function main() {
  if (!matchHost(location.href)) return;

  const job = detectJob(document);
  if (!job) return;

  const { label, badge, tooltip } = createBadge();

  // Fetched before vet-job so a repeat upsert from this very view doesn't
  // make the page look "already seen" — decision #22 is about prior visits.
  const seenResult = (await chrome.runtime.sendMessage({
    type: "check-seen",
    jobUrl: location.href,
  } satisfies BackgroundMessage)) as CheckSeenResult;

  if (seenResult.ok && seenResult.firstSeenAt) {
    tooltip.textContent = `You viewed this on ${new Date(
      seenResult.firstSeenAt,
    ).toLocaleDateString()}`;
    tooltip.classList.add("has-content");
  }

  const vetResult = (await chrome.runtime.sendMessage({
    type: "vet-job",
    job: { ...job, jobUrl: location.href },
  } satisfies BackgroundMessage)) as VetJobResult;

  if (!vetResult.ok) {
    badge.classList.add("error");
    label.textContent = vetResult.error;
    return;
  }

  const { score, gaps } = vetResult.draft.vettingSnapshot;
  const gap = topGap(gaps);
  label.textContent = gap
    ? `${score}/100 · ${gap.description}`
    : `${score}/100`;
}

void main();
