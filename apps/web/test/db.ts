import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

// Feature tests create their own uniquely-emailed user per test and clean
// it up in afterEach — cascading deletes (onDelete: Cascade in schema.prisma)
// take profile/searchCriteria/jobBoardSources/tokens/etc. with it.
export async function createTestUser() {
  const email = `test-${randomUUID()}@example.com`;
  const passwordHash = await hashPassword("irrelevant-for-tests");
  return db.user.create({ data: { email, passwordHash } });
}

export async function deleteTestUser(userId: string) {
  await db.user.delete({ where: { id: userId } }).catch(() => {
    // Already deleted by the test itself (e.g. a DELETE-route test) — fine.
  });
}
