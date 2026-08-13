import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { authMock, mockAuthModule, mockSessionUser } from "@/test/mock-auth";

vi.mock("@/auth", () => mockAuthModule());

const ConnectPage = (await import("./page")).default;

// ConnectPage is a Server Component: no browser, no client-side form
// interaction here (that needs jsdom/Playwright, not set up in this repo
// yet — see .claude/plan.md §6). What's actually testable and worth
// guarding without one: the auth-gating logic itself, since that's the
// one piece of real new logic in this page (everything else is already-
// tested fetch calls to /api/tokens from a client island).
describe("ConnectPage", () => {
  it("redirects to /login when there's no session", async () => {
    mockSessionUser(null);

    await expect(ConnectPage()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });

    const error = await ConnectPage().catch((caught: unknown) => caught);
    expect((error as { digest?: string }).digest).toContain("/login");
  });

  it("renders the logged-in user's email without redirecting", async () => {
    authMock.mockResolvedValue({
      user: { id: "user-1", email: "ada@example.com" },
    });

    const element = await ConnectPage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("ada@example.com");
    expect(html).toContain("Connect the Plugin");
  });
});
