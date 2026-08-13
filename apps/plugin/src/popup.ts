import type { LlmProviderId } from "@jobmatch/shared";
import { getSettings, getSyncState, setSettings } from "./lib/storage";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id} in popup.html`);
  return node as T;
}

const form = el<HTMLFormElement>("settings-form");
const apiBaseUrlInput = el<HTMLInputElement>("apiBaseUrl");
const patInput = el<HTMLInputElement>("pat");
const llmProviderSelect = el<HTMLSelectElement>("llmProvider");
const llmApiKeyInput = el<HTMLInputElement>("llmApiKey");
const syncNowButton = el<HTMLButtonElement>("sync-now");
const statusEl = el<HTMLDivElement>("status");

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
  apiBaseUrlInput.value = settings.apiBaseUrl;
  patInput.value = settings.pat ?? "";
  llmProviderSelect.value = settings.llmProvider ?? "claude";
  llmApiKeyInput.value = settings.llmApiKey ?? "";
  await renderStatus();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void (async () => {
    await setSettings({
      apiBaseUrl: apiBaseUrlInput.value.trim() || "http://localhost:3000",
      pat: patInput.value.trim() || null,
      llmProvider: (llmProviderSelect.value as LlmProviderId) || null,
      llmApiKey: llmApiKeyInput.value.trim() || null,
    });
    chrome.runtime.sendMessage({ type: "sync-now" });
    statusEl.classList.remove("error");
    statusEl.textContent = "Saved, syncing...";
  })();
});

syncNowButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "sync-now" });
  statusEl.classList.remove("error");
  statusEl.textContent = "Syncing...";
});

// Reflect background-driven sync updates (alarm-triggered, or the
// "sync-now" message above) while the popup happens to be open.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && "syncState" in changes) {
    void renderStatus();
  }
});

void loadForm();
