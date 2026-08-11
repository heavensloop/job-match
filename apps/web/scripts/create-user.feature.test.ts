import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createUser } from "@/lib/users";
import { verifyPassword } from "@/lib/auth/password";

const execFileAsync = promisify(execFile);

let createdUserIds: string[] = [];

afterEach(async () => {
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
  createdUserIds = [];
});

describe("createUser()", () => {
  it("creates a user with a verifiable password hash", async () => {
    const email = `test-${randomUUID()}@example.com`;
    const user = await createUser(email, "s3cret-password");
    createdUserIds.push(user.id);

    expect(user.email).toBe(email);
    await expect(
      verifyPassword("s3cret-password", user.passwordHash),
    ).resolves.toBe(true);
  });

  it("upserts: re-running for the same email resets the password", async () => {
    const email = `test-${randomUUID()}@example.com`;
    const first = await createUser(email, "old-password");
    createdUserIds.push(first.id);

    const second = await createUser(email, "new-password");

    expect(second.id).toBe(first.id);
    await expect(
      verifyPassword("new-password", second.passwordHash),
    ).resolves.toBe(true);
    await expect(
      verifyPassword("old-password", second.passwordHash),
    ).resolves.toBe(false);
  });
});

describe("create-user CLI (subprocess)", () => {
  it("provisions a user and prints confirmation", async () => {
    const email = `test-${randomUUID()}@example.com`;
    const { stdout } = await execFileAsync(
      "npx",
      ["tsx", "scripts/create-user.ts", email, "cli-password"],
      { cwd: process.cwd(), env: process.env },
    );

    expect(stdout).toContain("User ready:");
    expect(stdout).toContain(email);

    const user = await db.user.findUniqueOrThrow({ where: { email } });
    createdUserIds.push(user.id);
    await expect(
      verifyPassword("cli-password", user.passwordHash),
    ).resolves.toBe(true);
  });

  it("exits non-zero with a usage message when args are missing", async () => {
    await expect(
      execFileAsync("npx", ["tsx", "scripts/create-user.ts"], {
        cwd: process.cwd(),
        env: process.env,
      }),
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("Usage:"),
    });
  });
});
