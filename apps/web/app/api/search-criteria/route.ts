import { NextResponse } from "next/server";
import { SearchCriteriaSchema } from "@jobmatch/shared";
import { db } from "@/lib/db";
import { getAuthContext, getSessionUserId } from "@/lib/auth/context";
import { nullsToUndefined } from "@/lib/api/serialize";
import { handleApiError, unauthorized } from "@/lib/api/errors";

const SearchCriteriaInput = SearchCriteriaSchema.omit({
  id: true,
  userId: true,
  updatedAt: true,
});

// Readable by session (Web App) or PAT (Plugin's criteria-set picker, §5.4
// — the Plugin lists names/ids here, "active" selection stays local to it).
export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const rows = await db.searchCriteria.findMany({
      where: { userId: auth.userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      searchCriteria: rows.map((row) =>
        SearchCriteriaSchema.parse(nullsToUndefined(row)),
      ),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Criteria management is Web App UI only (§5.7) — session auth required.
export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const input = SearchCriteriaInput.parse(await request.json());

    const row = await db.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.searchCriteria.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.searchCriteria.create({ data: { userId, ...input } });
    });

    return NextResponse.json(
      SearchCriteriaSchema.parse(nullsToUndefined(row)),
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
