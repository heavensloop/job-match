import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { LlmProviderError } from "@/lib/llm/provider";

export class NotFoundError extends Error {}
export class BadRequestError extends Error {}

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
  if (error instanceof BadRequestError) {
    return jsonError(400, error.message);
  }
  if (error instanceof NotFoundError) {
    return jsonError(404, error.message || "Not found");
  }
  if (error instanceof LlmProviderError) {
    // The LLM (or our own parsing of its response) is what failed here,
    // not the client's request — 502, not 400/500.
    return jsonError(502, error.message);
  }
  console.error(error);
  return jsonError(500, "Internal server error");
}
