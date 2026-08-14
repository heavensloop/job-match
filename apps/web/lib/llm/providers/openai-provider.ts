import type { LlmCompletionParams, LlmProvider } from "../provider";
import { completeOpenAiCompatible } from "./openai-compatible";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

export class OpenAiProvider implements LlmProvider {
  constructor(private readonly apiKey: string) {}

  complete({
    systemPrompt,
    userPrompt,
    maxTokens = 2048,
  }: LlmCompletionParams): Promise<string> {
    return completeOpenAiCompatible({
      apiUrl: OPENAI_API_URL,
      apiKey: this.apiKey,
      model: OPENAI_MODEL,
      systemPrompt,
      userPrompt,
      maxTokens,
      providerLabel: "OpenAI",
    });
  }
}
