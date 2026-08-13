import { vi } from "vitest";

// A minimal in-memory stand-in for the chrome.* extension APIs, just
// enough surface for storage.ts/sync.ts/tab-state.ts/action-icon.ts/
// background.ts to run under Node.
export function installMockChrome() {
  const localStore: Record<string, unknown> = {};
  const sessionStore: Record<string, unknown> = {};
  const changeListeners: Array<
    (changes: Record<string, unknown>, areaName: string) => void
  > = [];

  function makeStorageArea(store: Record<string, unknown>, areaName: string) {
    return {
      get: vi.fn(async (key: string) => ({ [key]: store[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => {
        const changes: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(items)) {
          changes[key] = { oldValue: store[key], newValue: value };
          store[key] = value;
        }
        changeListeners.forEach((listener) => listener(changes, areaName));
      }),
      remove: vi.fn(async (key: string) => {
        const changes = {
          [key]: { oldValue: store[key], newValue: undefined },
        };
        delete store[key];
        changeListeners.forEach((listener) => listener(changes, areaName));
      }),
    };
  }

  const mockChrome = {
    storage: {
      local: makeStorageArea(localStore, "local"),
      session: makeStorageArea(sessionStore, "session"),
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
      onStartup: { addListener: vi.fn() },
      onMessage: { addListener: vi.fn() },
      sendMessage: vi.fn(),
    },
    alarms: {
      create: vi.fn(),
      onAlarm: { addListener: vi.fn() },
    },
    action: {
      setBadgeText: vi.fn(),
      setBadgeBackgroundColor: vi.fn(),
      setIcon: vi.fn(),
    },
    tabs: {
      onRemoved: { addListener: vi.fn() },
      onUpdated: { addListener: vi.fn() },
      query: vi.fn(),
    },
  };

  vi.stubGlobal("chrome", mockChrome);
  return { localStore, sessionStore, mockChrome };
}
