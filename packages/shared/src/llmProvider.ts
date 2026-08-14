import { z } from "zod";

// Which LLM the request should use (decision #27: all three stay pluggable).
// Sent by the Plugin as a header and read from the Web App's session state —
// both sides need to agree on these exact values.
export const LlmProviderIdSchema = z.enum(["claude", "openai", "free"]);
export type LlmProviderId = z.infer<typeof LlmProviderIdSchema>;
