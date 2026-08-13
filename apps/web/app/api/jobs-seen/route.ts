import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/context";
import {
  BadRequestError,
  handleApiError,
  unauthorized,
} from "@/lib/api/errors";

// Decision #22: the Plugin's badge hover state ("You viewed this on
// [date]") needs a cheap existence check against jobs_seen — this must
// stay separate from POST /api/vet, which pays for an LLM call.
export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const url = new URL(request.url).searchParams.get("url");
    if (!url) throw new BadRequestError("Missing url query parameter");

    const jobSeen = await db.jobSeen.findUnique({
      where: { userId_url: { userId: auth.userId, url } },
    });

    return NextResponse.json({
      firstSeenAt: jobSeen?.firstSeenAt.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
