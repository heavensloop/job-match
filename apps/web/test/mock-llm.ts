import { vi } from "vitest";

// Feature tests mock @/lib/llm/get-provider (the DI seam) rather than the
// individual provider classes, so no real network call ever happens.
export const completeMock = vi.fn();

export function mockLlmModule() {
  return {
    getLlmProvider: vi.fn(() => ({ complete: completeMock })),
  };
}

export function mockLlmTextResponse(text: string) {
  completeMock.mockResolvedValue(text);
}

export function mockLlmJsonResponse(value: unknown) {
  completeMock.mockResolvedValue(JSON.stringify(value));
}
