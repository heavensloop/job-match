import type { LlmProviderId } from "@jobmatch/shared";
import { WEB_APP_URL } from "./lib/config";
import {
  getSettings,
  getSyncState,
  setSettings,
  setSyncState,
} from "./lib/storage";
import { getTabState } from "./lib/tab-state";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id} in popup.html`);
  return node as T;
}

const activeCriteriaSelect = el<HTMLSelectElement>("activeCriteriaId");
const vetPageButton = el<HTMLButtonElement>("vet-page-button");
const jobInfoEl = el<HTMLElement>("job-info");
const accountStatusEl = el<HTMLDivElement>("account-status");
const loginButton = el<HTMLButtonElement>("login-button");
const logoutButton = el<HTMLButtonElement>("logout-button");
const settingsButton = el<HTMLButtonElement>("settings-button");
const settingsCloseButton = el<HTMLButtonElement>("settings-close");
const form = el<HTMLFormElement>("settings-form");
const llmProviderSelect = el<HTMLSelectElement>("llmProvider");
const llmApiKeyInput = el<HTMLInputElement>("llmApiKey");
const syncNowButton = el<HTMLButtonElement>("sync-now");
const statusEl = el<HTMLDivElement>("status");

function textEl(tag: string, text: string, className?: string): HTMLElement {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

// Job title/company/gap text all come from the page the content script
// read — untrusted input. Built via textContent, never innerHTML, so
// nothing in a crafted job posting can inject markup into the popup.
async function renderJobInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const state = tab?.id === undefined ? null : await getTabState(tab.id);

  jobInfoEl.replaceChildren();

  if (!state) {
    jobInfoEl.append(textEl("p", "No job page detected on this tab."));
    return;
  }

  jobInfoEl.append(
    textEl("p", `${state.job.title} at ${state.job.company}`, "job-title"),
  );

  if (state.status === "checking") {
    jobInfoEl.append(textEl("p", "Checking match…"));
    return;
  }

  if (!state.vetResult || !state.vetResult.ok) {
    const message =
      state.vetResult && !state.vetResult.ok
        ? state.vetResult.error
        : "Something went wrong.";
    jobInfoEl.append(textEl("p", message, "error"));
    return;
  }

  const { score, gaps } = state.vetResult.draft.vettingSnapshot;
  const topGap = gaps.find((gap) => gap.severity === "high") ?? gaps[0];

  jobInfoEl.append(textEl("p", `${score}/100`, "score"));
  if (topGap) jobInfoEl.append(textEl("p", topGap.description, "gap"));

  if (state.seenResult?.ok && state.seenResult.firstSeenAt) {
    const seenDate = new Date(
      state.seenResult.firstSeenAt,
    ).toLocaleDateString();
    jobInfoEl.append(textEl("p", `You viewed this on ${seenDate}`, "seen"));
  }
}

function renderAccount(settings: { pat: string | null }) {
  const connected = settings.pat !== null;
  accountStatusEl.textContent = connected ? "Connected" : "Not connected";
  loginButton.hidden = connected;
  logoutButton.hidden = !connected;
}

// Decision #7: active criteria is explicitly picked, never auto-selected —
// this dropdown is what makes that choice, from whatever runSync() has
// cached locally. vetJob() hard-fails without a selection here.
async function renderCriteriaOptions(selectedId: string | null) {
  const { criteria } = await getSyncState();
  activeCriteriaSelect.innerHTML = "";

  if (criteria.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "— none synced yet —";
    activeCriteriaSelect.append(option);
    activeCriteriaSelect.disabled = true;
    return;
  }

  activeCriteriaSelect.disabled = false;
  for (const criteriaSet of criteria) {
    const option = document.createElement("option");
    option.value = criteriaSet.id;
    option.textContent = criteriaSet.isDefault
      ? `${criteriaSet.name} (default)`
      : criteriaSet.name;
    activeCriteriaSelect.append(option);
  }

  if (selectedId && criteria.some((c) => c.id === selectedId)) {
    activeCriteriaSelect.value = selectedId;
  }

  // The browser may land on an option we never explicitly selected — most
  // commonly, there's only one to choose from, so it's just the default —
  // without persisting that, no "change" event ever fires (nothing to
  // change from) and vetJob() would see no active criteria at all despite
  // the dropdown visibly showing one selected. Keep storage in sync with
  // whatever ends up displayed, not just user-driven switches.
  if (activeCriteriaSelect.value && activeCriteriaSelect.value !== selectedId) {
    await setSettings({ activeCriteriaId: activeCriteriaSelect.value });
  }
}

async function renderStatus() {
  const { criteria, lastSyncedAt, lastSyncError } = await getSyncState();

  if (lastSyncError) {
    statusEl.textContent = `Sync error: ${lastSyncError}`;
    statusEl.classList.add("error");
    return;
  }

  statusEl.classList.remove("error");
  statusEl.textContent = lastSyncedAt
    ? `Synced ${criteria.length} search ${criteria.length === 1 ? "criteria set" : "criteria sets"} at ${new Date(lastSyncedAt).toLocaleTimeString()}`
    : "Not synced yet";
}

async function loadForm() {
  const settings = await getSettings();
  llmProviderSelect.value = settings.llmProvider ?? "claude";
  llmApiKeyInput.value = settings.llmApiKey ?? "";
  renderAccount(settings);
  await renderCriteriaOptions(settings.activeCriteriaId);
  await renderStatus();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void (async () => {
    await setSettings({
      llmProvider: (llmProviderSelect.value as LlmProviderId) || null,
      llmApiKey: llmApiKeyInput.value.trim() || null,
    });
    chrome.runtime.sendMessage({ type: "sync-now" });
    statusEl.classList.remove("error");
    statusEl.textContent = "Saved, syncing...";
  })();
});

// Now lives outside the Settings form (it's front-and-center above "Vet
// this page," not tucked away) — saves itself on change instead of
// waiting for the form's Save button.
activeCriteriaSelect.addEventListener("change", () => {
  void setSettings({ activeCriteriaId: activeCriteriaSelect.value || null });
});

// Reads the DOM of whatever tab is currently active — not gated to the
// LinkedIn/Greenhouse hosts content.ts auto-runs on — and vets it against
// the active search criteria. background.ts does the actual work; the
// result arrives back through the same tab-state listener that already
// renders automatic detections, so no extra rendering logic is needed
// here beyond this optimistic "in progress" message.
vetPageButton.addEventListener("click", () => {
  jobInfoEl.replaceChildren(textEl("p", "Vetting this page…"));
  chrome.runtime.sendMessage({ type: "vet-active-tab" });
});

syncNowButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "sync-now" });
  statusEl.classList.remove("error");
  statusEl.textContent = "Syncing...";
});

settingsButton.addEventListener("click", () => {
  settingsButton.hidden = true;
  form.hidden = false;
});

settingsCloseButton.addEventListener("click", () => {
  form.hidden = true;
  settingsButton.hidden = false;
});

loginButton.addEventListener("click", () => {
  chrome.tabs.create({ url: `${WEB_APP_URL}/login` });
});

// Local disconnect only — clears the stored PAT and the criteria list it
// synced, but doesn't revoke the token server-side (the popup only ever
// holds the token's secret, not its DB id). Revoke it from /connect if
// you want the token itself invalidated too.
logoutButton.addEventListener("click", () => {
  void (async () => {
    await setSettings({ pat: null, activeCriteriaId: null });
    await setSyncState({
      criteria: [],
      lastSyncedAt: null,
      lastSyncError: null,
    });
    await loadForm();
  })();
});

// Reflect background-driven updates while the popup happens to be open:
// sync results (settings, "local" area), the connect-bridge auto-handoff
// writing a PAT into "settings" (also "local"), and job-detection/vetting
// results (tab-state, "session" area).
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && "syncState" in changes) {
    void renderStatus();
    void renderCriteriaOptions(activeCriteriaSelect.value || null);
  }
  if (areaName === "local" && "settings" in changes) {
    void (async () => renderAccount(await getSettings()))();
  }
  if (areaName === "session") {
    void renderJobInfo();
  }
});

void loadForm();
void renderJobInfo();
