import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ApplicationDraftSchema,
  ProfileSchema,
  SearchCriteriaSchema,
  VettingResultSchema,
} from "@jobmatch/shared";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/context";
import { getLlmProvider } from "@/lib/llm/get-provider";
import { LlmProviderError } from "@/lib/llm/provider";
import { resolveLlmRequestConfig } from "@/lib/llm/resolve-llm-request";
import { buildVettingPrompt } from "@/lib/llm/prompts/vetting";
import { parseJsonResponse } from "@/lib/llm/parse-json-response";
import { nullsToUndefined } from "@/lib/api/serialize";
import { NotFoundError, handleApiError, unauthorized } from "@/lib/api/errors";

const VetInput = z.object({
  jobUrl: z.string().url(),
  jobTitle: z.string(),
  company: z.string(),
  jobDescriptionText: z.string().min(1),
  criteriaId: z.string().uuid(),
});

// §5.9. Callable from the Plugin (live browsing) or the Web App (reviewing
// crawled results) — session or PAT auth either way.
export async function POST(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const { providerId, apiKey } = resolveLlmRequestConfig(request);
    const input = VetInput.parse(await request.json());

    const [profileRow, criteriaRow] = await Promise.all([
      db.profile.findUnique({ where: { userId: auth.userId } }),
      db.searchCriteria.findUnique({ where: { id: input.criteriaId } }),
    ]);
    if (!profileRow) throw new NotFoundError("Profile not found");
    if (!criteriaRow || criteriaRow.userId !== auth.userId) {
      throw new NotFoundError("Search criteria not found");
    }

    // Dedup index entry for "have I seen this before" (decision #22) — a
    // no-op if the crawler (or an earlier vet) already recorded this url.
    const jobSeen = await db.jobSeen.upsert({
      where: { userId_url: { userId: auth.userId, url: input.jobUrl } },
      create: {
        userId: auth.userId,
        url: input.jobUrl,
        title: input.jobTitle,
        company: input.company,
      },
      update: {},
    });

    const existingDraft = await db.applicationDraft.findUnique({
      where: {
        jobId_criteriaId: { jobId: jobSeen.id, criteriaId: criteriaRow.id },
      },
    });

    // Cache by (url, profileVersion, criteriaId): a draft is still valid as
    // long as neither the profile nor the criteria set has changed since.
    if (
      existingDraft &&
      existingDraft.updatedAt >= profileRow.updatedAt &&
      existingDraft.updatedAt >= criteriaRow.updatedAt
    ) {
      return NextResponse.json(
        ApplicationDraftSchema.parse(nullsToUndefined(existingDraft)),
      );
    }

    const provider = getLlmProvider(providerId, apiKey);
    const { systemPrompt, userPrompt } = buildVettingPrompt({
      profile: ProfileSchema.parse(nullsToUndefined(profileRow)),
      criteria: SearchCriteriaSchema.parse(nullsToUndefined(criteriaRow)),
      jobTitle: input.jobTitle,
      company: input.company,
      jobDescriptionText: input.jobDescriptionText,
    });

    const rawResponse = await provider.complete({ systemPrompt, userPrompt });

    let vettingSnapshot;
    try {
      vettingSnapshot = VettingResultSchema.parse(
        parseJsonResponse(rawResponse),
      );
    } catch (parseError) {
      throw new LlmProviderError(
        `LLM response did not match the expected shape: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }`,
      );
    }

    const draft = await db.applicationDraft.upsert({
      where: {
        jobId_criteriaId: { jobId: jobSeen.id, criteriaId: criteriaRow.id },
      },
      create: {
        userId: auth.userId,
        jobId: jobSeen.id,
        criteriaId: criteriaRow.id,
        vettingSnapshot,
      },
      update: { vettingSnapshot },
    });

    return NextResponse.json(
      ApplicationDraftSchema.parse(nullsToUndefined(draft)),
      { status: existingDraft ? 200 : 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
