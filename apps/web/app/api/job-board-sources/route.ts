import { NextResponse } from "next/server";
import { JobBoardSourceSchema } from "@jobmatch/shared";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/context";
import { nullsToUndefined } from "@/lib/api/serialize";
import { handleApiError, unauthorized } from "@/lib/api/errors";
import { assertCriteriaOwnership } from "@/lib/api/ownership";

const JobBoardSourceInput = JobBoardSourceSchema.omit({ id: true });

// Job board source management is Web App UI only (§5.7) — the Plugin never
// touches this, so session auth throughout.

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const criteriaId = new URL(request.url).searchParams.get("criteriaId");
    if (criteriaId) await assertCriteriaOwnership(criteriaId, userId);

    const rows = await db.jobBoardSource.findMany({
      where: criteriaId ? { criteriaId } : { criteria: { userId } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      jobBoardSources: rows.map((row) =>
        JobBoardSourceSchema.parse(nullsToUndefined(row)),
      ),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const input = JobBoardSourceInput.parse(await request.json());
    await assertCriteriaOwnership(input.criteriaId, userId);

    const row = await db.jobBoardSource.create({ data: input });

    return NextResponse.json(
      JobBoardSourceSchema.parse(nullsToUndefined(row)),
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
