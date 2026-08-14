import type { LlmProviderId } from "@jobmatch/shared";
import type { LlmProvider } from "./provider";
import { ClaudeProvider } from "./providers/claude-provider";
import { OpenAiProvider } from "./providers/openai-provider";
import { FreeProvider } from "./providers/free-provider";

// DI wiring (mirrors getStorageAdapter): callers depend on LlmProvider, this
// is the one place that picks the concrete implementation, keyed by the
// user's own per-request choice — never a server-wide default.
export function getLlmProvider(
  providerId: LlmProviderId,
  apiKey: string,
): LlmProvider {
  switch (providerId) {
    case "claude":
      return new ClaudeProvider(apiKey);
    case "openai":
      return new OpenAiProvider(apiKey);
    case "free":
      return new FreeProvider(apiKey);
  }
}
