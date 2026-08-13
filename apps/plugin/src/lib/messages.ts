import type { DetectedJob } from "./host-registry";

// The single message contract between content.ts (page context, no direct
// API access) and background.ts (holds the PAT/LLM key, does the fetch).
// Responses are VetJobResult / CheckSeenResult (see vet-client.ts) — typed
// at the call site in content.ts rather than here, since chrome.runtime's
// sendMessage signature doesn't narrow a response type from the request.
export type BackgroundMessage =
  | { type: "sync-now" }
  | { type: "vet-job"; job: DetectedJob & { jobUrl: string } }
  | { type: "check-seen"; jobUrl: string };
