import { vi } from "vitest";

// A minimal in-memory stand-in for the chrome.* extension APIs, just
// enough surface for storage.ts/sync.ts/background.ts to run under Node.
export function installMockChrome() {
  const store: Record<string, unknown> = {};
  const changeListeners: Array<
    (changes: Record<string, unknown>, areaName: string) => void
  > = [];

  const mockChrome = {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: store[key] })),
        set: vi.fn(async (items: Record<string, unknown>) => {
          const changes: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(items)) {
            changes[key] = { oldValue: store[key], newValue: value };
            store[key] = value;
          }
          changeListeners.forEach((listener) => listener(changes, "local"));
        }),
      },
      onChanged: {
        addListener: vi.fn(
          (
            listener: (
              changes: Record<string, unknown>,
              areaName: string,
            ) => void,
          ) => {
            changeListeners.push(listener);
          },
        ),
      },
    },
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onMessage: { addListener: vi.fn() },
      sendMessage: vi.fn(),
    },
    alarms: {
      create: vi.fn(),
      onAlarm: { addListener: vi.fn() },
    },
  };

  vi.stubGlobal("chrome", mockChrome);
  return { store, mockChrome };
}
