import {
  ApplicationDraftSchema,
  type ApplicationDraft,
} from "@jobmatch/shared";
import { apiFetch } from "./api-client";
import { getSettings } from "./storage";
import type { DetectedJob } from "./host-registry";

export type VetJobResult =
  { ok: true; draft: ApplicationDraft } | { ok: false; error: string };

// Called from the badge (§5.2) via a background message — the content
// script never talks to the Web App directly, so the PAT/LLM key stay out
// of the page's own JS context.
export async function vetJob(
  job: DetectedJob & { jobUrl: string },
): Promise<VetJobResult> {
  const settings = await getSettings();

  if (!settings.pat) {
    return { ok: false, error: "No personal access token configured" };
  }
  if (!settings.llmProvider || !settings.llmApiKey) {
    return { ok: false, error: "No LLM provider/key configured" };
  }
  if (!settings.activeCriteriaId) {
    return { ok: false, error: "No active search criteria selected" };
  }

  try {
    const res = await apiFetch("/api/vet", {
      apiBaseUrl: settings.apiBaseUrl,
      pat: settings.pat,
      init: {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-llm-provider": settings.llmProvider,
          "x-llm-api-key": settings.llmApiKey,
        },
        body: JSON.stringify({
          jobUrl: job.jobUrl,
          jobTitle: job.title,
          company: job.company,
          jobDescriptionText: job.descriptionText,
          criteriaId: settings.activeCriteriaId,
        }),
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return {
        ok: false,
        error: body?.error ?? `Vetting failed: HTTP ${res.status}`,
      };
    }

    return { ok: true, draft: ApplicationDraftSchema.parse(await res.json()) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export type CheckSeenResult =
  { ok: true; firstSeenAt: string | null } | { ok: false; error: string };

// Fetched *before* vetJob() runs for the same page view — vetJob's upsert
// of jobs_seen would otherwise make every page look "already seen"
// (decision #22 means the prior view, not this one).
export async function checkSeen(jobUrl: string): Promise<CheckSeenResult> {
  const settings = await getSettings();
  if (!settings.pat) {
    return { ok: false, error: "No personal access token configured" };
  }

  try {
    const res = await apiFetch(
      `/api/jobs-seen?url=${encodeURIComponent(jobUrl)}`,
      {
        apiBaseUrl: settings.apiBaseUrl,
        pat: settings.pat,
      },
    );

    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

    const body = await res.json();
    return { ok: true, firstSeenAt: body.firstSeenAt ?? null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
