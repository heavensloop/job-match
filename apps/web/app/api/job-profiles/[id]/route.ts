import { NextResponse } from "next/server";
import { JobProfileSchema } from "@jobmatch/shared";
import { db } from "@/lib/db";
import { getAuthContext, getSessionUserId } from "@/lib/auth/context";
import { nullsToUndefined } from "@/lib/api/serialize";
import {
  BadRequestError,
  NotFoundError,
  handleApiError,
  unauthorized,
} from "@/lib/api/errors";

const JobProfileUpdateInput = JobProfileSchema.omit({
  id: true,
  personId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

async function findOwned(id: string, userId: string) {
  const row = await db.jobProfile.findUnique({
    where: { id },
    include: { person: true },
  });
  if (!row || row.person.userId !== userId) {
    throw new NotFoundError("Job profile not found");
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

    return NextResponse.json(JobProfileSchema.parse(nullsToUndefined(row)));
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
    const existing = await findOwned(id, userId);

    const input = JobProfileUpdateInput.parse(await request.json());

    if (input.jobTitle && input.jobTitle !== existing.jobTitle) {
      const duplicate = await db.jobProfile.findFirst({
        where: {
          personId: existing.personId,
          jobTitle: input.jobTitle,
          NOT: { id },
        },
      });
      if (duplicate) {
        throw new BadRequestError(
          "You already have a job profile with this job title",
        );
      }
    }

    const row = await db.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.jobProfile.updateMany({
          where: { personId: existing.personId, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.jobProfile.update({ where: { id }, data: input });
    });

    return NextResponse.json(JobProfileSchema.parse(nullsToUndefined(row)));
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

    await db.jobProfile.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
