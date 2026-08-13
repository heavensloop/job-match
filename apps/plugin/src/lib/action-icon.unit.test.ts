import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installMockChrome } from "../../test/mock-chrome";
import { setActionIcon } from "./action-icon";
import { vi } from "vitest";

let mockChrome: ReturnType<typeof installMockChrome>["mockChrome"];

beforeEach(() => {
  ({ mockChrome } = installMockChrome());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("setActionIcon", () => {
  it("clears the badge text for 'none'", async () => {
    await setActionIcon(1, "none");
    expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
      tabId: 1,
      text: "",
    });
    expect(mockChrome.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
  });

  it("shows a gray ellipsis for 'checking'", async () => {
    await setActionIcon(1, "checking");
    expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
      tabId: 1,
      text: "…",
    });
    expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      tabId: 1,
      color: "#9e9e9e",
    });
  });

  it("shows the score text on a green background for 'ready'", async () => {
    await setActionIcon(1, "ready", "82");
    expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
      tabId: 1,
      text: "82",
    });
    expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      tabId: 1,
      color: "#2ecc71",
    });
  });

  it("shows an amber '!' for 'error', ignoring any scoreText", async () => {
    await setActionIcon(1, "error", "82");
    expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({
      tabId: 1,
      text: "!",
    });
    expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      tabId: 1,
      color: "#e67e22",
    });
  });
});
