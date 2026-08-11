import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

// Shared by scripts/create-user.ts (CLI) and its tests. Upsert semantics:
// re-running with the same email resets that user's password.
export async function createUser(email: string, password: string) {
  const passwordHash = await hashPassword(password);
  return db.user.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash },
  });
}
