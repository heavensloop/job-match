import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/api/errors";

export async function assertCriteriaOwnership(
  criteriaId: string,
  userId: string,
): Promise<void> {
  const criteria = await db.searchCriteria.findUnique({
    where: { id: criteriaId },
  });
  if (!criteria || criteria.userId !== userId) {
    throw new NotFoundError("Search criteria not found");
  }
}
