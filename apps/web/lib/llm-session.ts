import type { LlmProviderId } from "@jobmatch/shared";

// Decision #18's Web-App-side analog of the Plugin's chrome.storage.local
// key: sessionStorage only, cleared when the tab/browser closes, never
// sent anywhere except as a header on the one request that needs it.
// Intentionally minimal — just enough for the resume-import flow's LLM
// calls, not a full "LLM settings" page (that's a separate §5.6 item).
const SESSION_KEY = "jobmatch:llm-session";

export interface SessionLlmConfig {
  providerId: LlmProviderId;
  apiKey: string;
}

export function getSessionLlmConfig(): SessionLlmConfig | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionLlmConfig;
  } catch {
    return null;
  }
}

export function setSessionLlmConfig(config: SessionLlmConfig): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(config));
}

export function sessionLlmHeaders(
  config: SessionLlmConfig,
): Record<string, string> {
  return {
    "x-llm-provider": config.providerId,
    "x-llm-api-key": config.apiKey,
  };
}
