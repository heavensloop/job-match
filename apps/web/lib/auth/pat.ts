import { randomBytes, createHash } from "crypto";

const TOKEN_PREFIX = "jmc_pat_";

// Personal access tokens (decision #12): the Plugin's machine-to-machine
// auth, separate from NextAuth's cookie sessions. Only the sha256 hash is
// ever persisted; the plaintext token is shown to the user exactly once,
// at creation time.
export function generatePersonalAccessToken(): {
  token: string;
  tokenHash: string;
} {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function looksLikePersonalAccessToken(value: string): boolean {
  return value.startsWith(TOKEN_PREFIX);
}
