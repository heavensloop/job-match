import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/auth/pat";

export interface AuthContext {
  userId: string;
}

// For endpoints that must only ever be called from the logged-in Web App UI
// (e.g. minting a new PAT) — a PAT must never be usable to mint more PATs.
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user.id ?? null;
}

// Resolves the caller's identity from either auth method the API needs to
// support: a NextAuth session cookie (Web App UI) or a PAT bearer token
// (Plugin, decision #12). Route handlers stay agnostic to which was used.
export async function getAuthContext(
  request: Request,
): Promise<AuthContext | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return getAuthContextFromPat(authHeader.slice("Bearer ".length).trim());
  }

  const session = await auth();
  if (session?.user.id) {
    return { userId: session.user.id };
  }

  return null;
}

async function getAuthContextFromPat(
  token: string,
): Promise<AuthContext | null> {
  if (!token) return null;

  const pat = await db.personalAccessToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!pat || pat.revokedAt) return null;

  await db.personalAccessToken.update({
    where: { id: pat.id },
    data: { lastUsedAt: new Date() },
  });

  return { userId: pat.userId };
}
