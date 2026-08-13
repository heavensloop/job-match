import type { LlmCompletionParams, LlmProvider } from "../provider";
import { completeOpenAiCompatible } from "./openai-compatible";

// Free/open-weight tier (decision #19): Groq's OpenAI-compatible API,
// serving open-weight models. Same request/response shape as OpenAI.
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export class FreeProvider implements LlmProvider {
  constructor(private readonly apiKey: string) {}

  complete({
    systemPrompt,
    userPrompt,
    maxTokens = 2048,
  }: LlmCompletionParams): Promise<string> {
    return completeOpenAiCompatible({
      apiUrl: GROQ_API_URL,
      apiKey: this.apiKey,
      model: GROQ_MODEL,
      systemPrompt,
      userPrompt,
      maxTokens,
      providerLabel: "Groq",
    });
  }
}
