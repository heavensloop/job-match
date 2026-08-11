import { NextResponse } from "next/server";
import { JobBoardSourceSchema } from "@jobmatch/shared";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/context";
import { nullsToUndefined } from "@/lib/api/serialize";
import { NotFoundError, handleApiError, unauthorized } from "@/lib/api/errors";
import { assertCriteriaOwnership } from "@/lib/api/ownership";

const JobBoardSourceUpdateInput = JobBoardSourceSchema.omit({
  id: true,
}).partial();

async function findOwned(id: string, userId: string) {
  const row = await db.jobBoardSource.findUnique({
    where: { id },
    include: { criteria: true },
  });
  if (!row || row.criteria.userId !== userId) {
    throw new NotFoundError("Job board source not found");
  }
  return row;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const { id } = await params;
    const row = await findOwned(id, userId);

    return NextResponse.json(JobBoardSourceSchema.parse(nullsToUndefined(row)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const { id } = await params;
    await findOwned(id, userId);

    const input = JobBoardSourceUpdateInput.parse(await request.json());
    if (input.criteriaId)
      await assertCriteriaOwnership(input.criteriaId, userId);

    const row = await db.jobBoardSource.update({ where: { id }, data: input });

    return NextResponse.json(JobBoardSourceSchema.parse(nullsToUndefined(row)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const { id } = await params;
    await findOwned(id, userId);

    await db.jobBoardSource.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
