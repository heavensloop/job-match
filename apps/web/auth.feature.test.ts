import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { handlers } from "@/auth";
import { createUser } from "@/lib/users";
import { deleteTestUser } from "@/test/db";

// Unlike every other feature test in this app, @/auth is NOT mocked here —
// this exercises the real NextAuth credentials flow (CSRF token -> sign in
// -> session cookie) that both /login and /connect depend on, automating
// the manual curl sequence used to smoke-test this earlier.
function cookieHeaderFrom(setCookieValues: string[]): string {
  return setCookieValues.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function signIn(email: string, password: string) {
  const csrfRes = await handlers.GET(
    new NextRequest("http://localhost:3000/api/auth/csrf"),
  );
  const csrfCookies = csrfRes.headers.getSetCookie();
  const { csrfToken } = await csrfRes.json();

  const body = new URLSearchParams({
    email,
    password,
    csrfToken,
    json: "true",
  });

  return handlers.POST(
    new NextRequest("http://localhost:3000/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: cookieHeaderFrom(csrfCookies),
      },
      body: body.toString(),
    }),
  );
}

let userId: string | undefined;

afterEach(async () => {
  if (userId) await deleteTestUser(userId);
  userId = undefined;
});

describe("NextAuth credentials sign-in", () => {
  it("issues a session cookie for correct credentials", async () => {
    const email = `test-${randomUUID()}@example.com`;
    const password = "correct-horse-battery-staple";
    const user = await createUser(email, password);
    userId = user.id;

    const res = await signIn(email, password);

    const sessionCookies = res.headers.getSetCookie();
    expect(
      sessionCookies.some((cookie) => cookie.includes("session-token")),
    ).toBe(true);
  });

  it("does not issue a session cookie for the wrong password", async () => {
    const email = `test-${randomUUID()}@example.com`;
    const user = await createUser(email, "correct-password");
    userId = user.id;

    const res = await signIn(email, "wrong-password");

    const sessionCookies = res.headers.getSetCookie();
    expect(
      sessionCookies.some((cookie) => cookie.includes("session-token")),
    ).toBe(false);
  });

  it("does not issue a session cookie for an unknown email", async () => {
    const res = await signIn(`nobody-${randomUUID()}@example.com`, "whatever");

    const sessionCookies = res.headers.getSetCookie();
    expect(
      sessionCookies.some((cookie) => cookie.includes("session-token")),
    ).toBe(false);
  });
});
