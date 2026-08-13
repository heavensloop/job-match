import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth/context";
import { getLlmProvider } from "@/lib/llm/get-provider";
import { LlmProviderError } from "@/lib/llm/provider";
import { resolveLlmRequestConfig } from "@/lib/llm/resolve-llm-request";
import {
  ResumeParseResultSchema,
  buildResumeParsePrompt,
} from "@/lib/llm/prompts/resume-parse";
import { parseJsonResponse } from "@/lib/llm/parse-json-response";
import { handleApiError, unauthorized } from "@/lib/api/errors";

const ParseInput = z.object({
  // Already-extracted text — either from the resume PDF or from the
  // LinkedIn export's Positions/Education/Skills CSVs (§5.6). Extraction
  // itself isn't this endpoint's job, just structuring the text via LLM.
  text: z.string().min(1),
});

// Stateless: returns a suggested parse for the review/edit form, doesn't
// write to the profile itself — that happens via PUT /api/profile once the
// user has reviewed it. Web App UI only, session auth required.
export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const { providerId, apiKey } = resolveLlmRequestConfig(request);
    const { text } = ParseInput.parse(await request.json());

    const provider = getLlmProvider(providerId, apiKey);
    const { systemPrompt, userPrompt } = buildResumeParsePrompt(text);
    const rawResponse = await provider.complete({ systemPrompt, userPrompt });

    let result;
    try {
      result = ResumeParseResultSchema.parse(parseJsonResponse(rawResponse));
    } catch (parseError) {
      throw new LlmProviderError(
        `LLM response did not match the expected shape: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }`,
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
