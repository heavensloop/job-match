import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/context";
import { NotFoundError, handleApiError, unauthorized } from "@/lib/api/errors";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const { id } = await params;
    const existing = await db.personalAccessToken.findUnique({
      where: { id },
    });
    // 404 rather than 403 for another user's token, so existence isn't leaked.
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError("Token not found");
    }

    const revoked = await db.personalAccessToken.update({
      where: { id },
      data: { revokedAt: new Date() },
      select: { id: true, name: true, revokedAt: true },
    });

    return NextResponse.json(revoked);
  } catch (error) {
    return handleApiError(error);
  }
}
