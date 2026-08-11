import { NextResponse } from "next/server";
import { SearchCriteriaSchema } from "@jobmatch/shared";
import { db } from "@/lib/db";
import { getAuthContext, getSessionUserId } from "@/lib/auth/context";
import { nullsToUndefined } from "@/lib/api/serialize";
import { NotFoundError, handleApiError, unauthorized } from "@/lib/api/errors";

const SearchCriteriaUpdateInput = SearchCriteriaSchema.omit({
  id: true,
  userId: true,
  updatedAt: true,
}).partial();

async function findOwned(id: string, userId: string) {
  const row = await db.searchCriteria.findUnique({ where: { id } });
  if (!row || row.userId !== userId) {
    throw new NotFoundError("Search criteria not found");
  }
  return row;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const { id } = await params;
    const row = await findOwned(id, auth.userId);

    return NextResponse.json(SearchCriteriaSchema.parse(nullsToUndefined(row)));
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

    const input = SearchCriteriaUpdateInput.parse(await request.json());

    const row = await db.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.searchCriteria.updateMany({
          where: { userId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.searchCriteria.update({ where: { id }, data: input });
    });

    return NextResponse.json(SearchCriteriaSchema.parse(nullsToUndefined(row)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const { id } = await params;
    await findOwned(id, userId);

    await db.searchCriteria.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
