import { LlmProviderError } from "../provider";

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
    throw new LlmProviderError(
      `${params.providerLabel} API error (${res.status}): ${await res.text()}`,
    );
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
