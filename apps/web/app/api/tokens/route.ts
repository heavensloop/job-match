import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth/context";
import { generatePersonalAccessToken } from "@/lib/auth/pat";
import { handleApiError, unauthorized } from "@/lib/api/errors";

const CreateTokenInput = z.object({
  name: z.string().min(1).max(200),
});

// Token management is Web App UI only (§5.5) — session auth required, a PAT
// must never be usable to mint or list more PATs.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  const tokens = await db.personalAccessToken.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  });

  return NextResponse.json({ tokens });
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const body = CreateTokenInput.parse(await request.json());
    const { token, tokenHash } = generatePersonalAccessToken();

    const record = await db.personalAccessToken.create({
      data: { userId, name: body.name, tokenHash },
      select: { id: true, name: true, createdAt: true },
    });

    // The plaintext token is only ever returned here, at creation time.
    return NextResponse.json({ ...record, token }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
