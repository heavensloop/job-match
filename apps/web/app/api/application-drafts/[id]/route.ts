import { NextResponse } from "next/server";
import { ApplicationDraftSchema } from "@jobmatch/shared";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/context";
import { nullsToUndefined } from "@/lib/api/serialize";
import { NotFoundError, handleApiError, unauthorized } from "@/lib/api/errors";

async function findOwned(id: string, userId: string) {
  const row = await db.applicationDraft.findUnique({
    where: { id },
    include: { job: true, criteria: true },
  });
  if (!row || row.userId !== userId) {
    throw new NotFoundError("Application draft not found");
  }
  return row;
}

// Read-only detail view backing the Plugin's "Show Details" link and the
// Web App's own /application-drafts/[id] page — session or PAT auth
// either way, same callers as POST /api/vet. Includes the job/criteria
// name alongside the draft since ApplicationDraftSchema itself only has
// the bare ids, and a details page needs the job title/company/url to be
// legible at all.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const { id } = await params;
    const row = await findOwned(id, auth.userId);

    return NextResponse.json({
      ...ApplicationDraftSchema.parse(nullsToUndefined(row)),
      job: {
        title: row.job.title,
        company: row.job.company,
        url: row.job.url,
      },
      criteriaName: row.criteria.name,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
