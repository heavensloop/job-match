import { NextResponse } from "next/server";
import { ProfileSchema } from "@jobmatch/shared";
import { db } from "@/lib/db";
import { getAuthContext, getSessionUserId } from "@/lib/auth/context";
import { nullsToUndefined } from "@/lib/api/serialize";
import { NotFoundError, handleApiError, unauthorized } from "@/lib/api/errors";

// Client sends the full edited profile each time (the resume review/edit
// form, §5.6) — PUT replaces the whole row rather than patching fields.
const ProfileInput = ProfileSchema.omit({
  id: true,
  userId: true,
  updatedAt: true,
});

// Readable by session (Web App) or PAT (Plugin autofill needs profile data
// to map form fields, §5.3).
export async function GET(request: Request) {
  try {
    const auth = await getAuthContext(request);
    if (!auth) return unauthorized();

    const row = await db.profile.findUnique({ where: { userId: auth.userId } });
    if (!row) throw new NotFoundError("Profile not found");

    return NextResponse.json(ProfileSchema.parse(nullsToUndefined(row)));
  } catch (error) {
    return handleApiError(error);
  }
}

// Editing only happens in the Web App UI — session auth required.
export async function PUT(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const input = ProfileInput.parse(await request.json());

    const row = await db.profile.upsert({
      where: { userId },
      create: { userId, ...input },
      update: { ...input },
    });

    return NextResponse.json(ProfileSchema.parse(nullsToUndefined(row)));
  } catch (error) {
    return handleApiError(error);
  }
}
