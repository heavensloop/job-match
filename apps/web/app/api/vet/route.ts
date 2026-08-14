import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ApplicationDraftSchema,
  JobProfileSchema,
  PersonSchema,
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
  // Optional: callers with no concept of multiple profiles yet (the
  // Plugin, as of this endpoint's last update) omit this and get the
  // person's isDefault JobProfile instead.
  jobProfileId: z.string().uuid().optional(),
});

// §5.9. Callable from the Plugin (live browsing) or the Web App (reviewing
// crawled results) — session or PAT auth either way.
export async function POST(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const { providerId, apiKey } = resolveLlmRequestConfig(request);
    const input = VetInput.parse(await request.json());

    const [personRow, criteriaRow] = await Promise.all([
      db.person.findUnique({ where: { userId: auth.userId } }),
      db.searchCriteria.findUnique({ where: { id: input.criteriaId } }),
    ]);
    if (!personRow) throw new NotFoundError("Person not found");
    if (!criteriaRow || criteriaRow.userId !== auth.userId) {
      throw new NotFoundError("Search criteria not found");
    }

    const jobProfileRow = input.jobProfileId
      ? await db.jobProfile.findUnique({ where: { id: input.jobProfileId } })
      : await db.jobProfile.findFirst({
          where: { personId: personRow.id, isDefault: true },
        });
    if (!jobProfileRow || jobProfileRow.personId !== personRow.id) {
      throw new NotFoundError(
        input.jobProfileId
          ? "Job profile not found"
          : "No default job profile — specify jobProfileId or mark one as default",
      );
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
        jobId_criteriaId_jobProfileId: {
          jobId: jobSeen.id,
          criteriaId: criteriaRow.id,
          jobProfileId: jobProfileRow.id,
        },
      },
    });

    // Cache by (url, jobProfileVersion, criteriaId): a draft is still valid
    // as long as neither the job profile nor the criteria set has changed
    // since (Person's fields don't affect the score, so they don't factor
    // into freshness).
    if (
      existingDraft &&
      existingDraft.updatedAt >= jobProfileRow.updatedAt &&
      existingDraft.updatedAt >= criteriaRow.updatedAt
    ) {
      return NextResponse.json(
        ApplicationDraftSchema.parse(nullsToUndefined(existingDraft)),
      );
    }

    const provider = getLlmProvider(providerId, apiKey);
    const { systemPrompt, userPrompt } = buildVettingPrompt({
      person: PersonSchema.parse(nullsToUndefined(personRow)),
      jobProfile: JobProfileSchema.parse(nullsToUndefined(jobProfileRow)),
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
        jobId_criteriaId_jobProfileId: {
          jobId: jobSeen.id,
          criteriaId: criteriaRow.id,
          jobProfileId: jobProfileRow.id,
        },
      },
      create: {
        userId: auth.userId,
        jobId: jobSeen.id,
        criteriaId: criteriaRow.id,
        jobProfileId: jobProfileRow.id,
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
