import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { LlmAuthError, LlmProviderError } from "@/lib/llm/provider";
import {
  NotFoundError,
  handleApiError,
  jsonError,
  unauthorized,
} from "./errors";

describe("jsonError", () => {
  it("builds a JSON response with the given status and message", async () => {
    const res = jsonError(418, "I'm a teapot");
    expect(res.status).toBe(418);
    await expect(res.json()).resolves.toEqual({ error: "I'm a teapot" });
  });

  it("includes details when provided", async () => {
    const res = jsonError(400, "bad", { field: "x" });
    await expect(res.json()).resolves.toEqual({
      error: "bad",
      details: { field: "x" },
    });
  });
});

describe("unauthorized", () => {
  it("returns a 401 with a generic message", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});

describe("handleApiError", () => {
  it("maps a ZodError to 400 with flattened details", async () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({});
    if (result.success) throw new Error("expected parse failure");

    const res = handleApiError(result.error);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request body");
    expect(body.details).toBeDefined();
  });

  it("maps a NotFoundError to 404 with its message", async () => {
    const res = handleApiError(new NotFoundError("Widget not found"));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Widget not found" });
  });

  it("maps an LlmProviderError to 502 with its (already-sanitized) message", async () => {
    const res = handleApiError(new LlmProviderError("Groq API error (429)"));
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({
      error: "Groq API error (429)",
    });
  });

  it("maps an LlmAuthError to 401 with a machine-readable code, distinct from a plain session-auth 401", async () => {
    const res = handleApiError(new LlmAuthError("Incorrect API key provided"));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: "Incorrect API key provided",
      details: { code: "llm_auth_failed" },
    });
  });

  it("maps an unknown error to 500 without leaking details", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = handleApiError(new Error("some internal secret"));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Internal server error",
    });
    spy.mockRestore();
  });
});
