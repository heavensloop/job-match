// Port for LLM calls (decisions #19/#27: Claude, OpenAI, and a free/open
// provider all stay pluggable, user picks per their own key). Feature code
// (vetting, resume parsing) depends on this interface, never on a specific
// provider's API shape directly — mirrors the StorageAdapter pattern.

export interface LlmCompletionParams {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

export interface LlmProvider {
  complete(params: LlmCompletionParams): Promise<string>;
}

export class LlmProviderError extends Error {}

// Specifically an upstream 401/403 (missing/invalid key) rather than any
// other provider failure — callers use this to offer re-entering the key
// instead of just surfacing a generic error.
export class LlmAuthError extends LlmProviderError {}
