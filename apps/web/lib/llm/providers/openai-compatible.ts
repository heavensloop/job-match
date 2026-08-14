import { LlmAuthError, LlmProviderError } from "../provider";

// Pulls just the human-readable message out of an OpenAI-shaped error body
// (`{ error: { message } }`) instead of surfacing the raw JSON blob —
// providers also echo back a redacted form of the key in that message
// (e.g. "gsk_ATW3***...***nFCb"), which is fine to show as-is.
function extractProviderMessage(
  bodyText: string,
  status: number,
  providerLabel: string,
): string {
  try {
    const parsed = JSON.parse(bodyText);
    const message = parsed?.error?.message ?? parsed?.message;
    if (typeof message === "string" && message) return message;
  } catch {
    // Non-JSON error body — fall through to the generic message below.
  }
  return `${providerLabel} API error (${status})`;
}

// Shared by OpenAiProvider and FreeProvider — both speak the same OpenAI
// Chat Completions request/response shape, just against different hosts,
// models, and keys.
export async function completeOpenAiCompatible(params: {
  apiUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  providerLabel: string;
}): Promise<string> {
  const res = await fetch(params.apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      max_tokens: params.maxTokens,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const message = extractProviderMessage(
      await res.text(),
      res.status,
      params.providerLabel,
    );
    if (res.status === 401 || res.status === 403) {
      throw new LlmAuthError(message);
    }
    throw new LlmProviderError(message);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new LlmProviderError(
      `${params.providerLabel} API returned no text content`,
    );
  }
  return text;
}
