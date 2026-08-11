import { vi } from "vitest";

// Route/context feature tests mock @/auth (the actual NextAuth boundary)
// rather than our own lib/auth/context — that way getAuthContext's real
// session-vs-PAT resolution logic still runs under test.
export const authMock = vi.fn();

export function mockAuthModule() {
  return {
    auth: authMock,
    handlers: { GET: vi.fn(), POST: vi.fn() },
    signIn: vi.fn(),
    signOut: vi.fn(),
  };
}

export function mockSessionUser(userId: string | null) {
  authMock.mockResolvedValue(userId ? { user: { id: userId } } : null);
}
