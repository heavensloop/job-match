import { NextResponse } from "next/server";
import { JobProfileSchema } from "@jobmatch/shared";
import { db } from "@/lib/db";
import { getAuthContext, getSessionUserId } from "@/lib/auth/context";
import { nullsToUndefined } from "@/lib/api/serialize";
import {
  BadRequestError,
  handleApiError,
  unauthorized,
} from "@/lib/api/errors";

const JobProfileInput = JobProfileSchema.omit({
  id: true,
  personId: true,
  createdAt: true,
  updatedAt: true,
});

// Readable by session (Web App) or PAT (Plugin's future job-profile
// picker, mirroring the existing search-criteria picker — §5.4 follow-up,
// not built yet). No person record yet just means no profiles yet.
export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const person = await db.person.findUnique({
      where: { userId: auth.userId },
    });
    if (!person) return NextResponse.json({ jobProfiles: [] });

    const rows = await db.jobProfile.findMany({
      where: { personId: person.id },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      jobProfiles: rows.map((row) =>
        JobProfileSchema.parse(nullsToUndefined(row)),
      ),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Job profile management is Web App UI only — session auth required.
export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const person = await db.person.findUnique({ where: { userId } });
    if (!person) {
      throw new BadRequestError(
        "Fill out your identity details before adding a job profile",
      );
    }

    const input = JobProfileInput.parse(await request.json());

    const duplicate = await db.jobProfile.findFirst({
      where: { personId: person.id, jobTitle: input.jobTitle },
    });
    if (duplicate) {
      throw new BadRequestError(
        "You already have a job profile with this job title",
      );
    }

    const row = await db.$transaction(async (tx) => {
      // The very first job profile is always the default, so the vetting
      // endpoint (§5.9) always has a sane fallback once at least one
      // profile exists, even for a caller with no concept of profiles yet.
      const existingCount = await tx.jobProfile.count({
        where: { personId: person.id },
      });
      const isDefault = input.isDefault || existingCount === 0;

      if (isDefault) {
        await tx.jobProfile.updateMany({
          where: { personId: person.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.jobProfile.create({
        data: { personId: person.id, ...input, isDefault },
      });
    });

    return NextResponse.json(JobProfileSchema.parse(nullsToUndefined(row)), {
      status: 201,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
