import { LlmProviderIdSchema, type LlmProviderId } from "@jobmatch/shared";
import { BadRequestError } from "@/lib/api/errors";

export interface LlmRequestConfig {
  providerId: LlmProviderId;
  apiKey: string;
}

// Decision #18: the key is never persisted, it travels on every request —
// as a header from the Plugin's chrome.storage.local, or from the Web
// App's session-held value. A missing/invalid key is a hard failure here,
// there's no "saved key" to fall back on.
export function resolveLlmRequestConfig(request: Request): LlmRequestConfig {
  const apiKey = request.headers.get("x-llm-api-key");
  const providerIdRaw = request.headers.get("x-llm-provider");

  if (!apiKey) {
    throw new BadRequestError("Missing X-LLM-Api-Key header");
  }

  const parsed = LlmProviderIdSchema.safeParse(providerIdRaw);
  if (!parsed.success) {
    throw new BadRequestError(
      "Missing or invalid X-LLM-Provider header (expected claude, openai, or free)",
    );
  }

  return { providerId: parsed.data, apiKey };
}
