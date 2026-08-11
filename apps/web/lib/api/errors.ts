import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class NotFoundError extends Error {}

export function jsonError(
  status: number,
  message: string,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    { status },
  );
}

export function unauthorized(): NextResponse {
  return jsonError(401, "Unauthorized");
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return jsonError(400, "Invalid request body", error.flatten());
  }
  if (error instanceof NotFoundError) {
    return jsonError(404, error.message || "Not found");
  }
  console.error(error);
  return jsonError(500, "Internal server error");
}
