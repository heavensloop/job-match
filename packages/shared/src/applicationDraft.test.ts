import { describe, expect, it } from "vitest";
import { ApplicationDraftSchema } from "./applicationDraft";

const valid = {
  id: "8a2f6c9e-3f1a-4b2a-9c3d-1e2f3a4b5c6d",
  userId: "1a2b3c4d-5e6f-4789-abcd-ef0123456789",
  jobId: "2b3c4d5e-6f70-4890-bcde-f01234567890",
  criteriaId: "3c4d5e6f-7081-4901-cdef-012345678901",
  jobProfileId: "4d5e6f70-8192-4a12-def0-123456789012",
  vettingSnapshot: {
    score: 75,
    recommendation: "possible_match",
    summary: "Decent overlap.",
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ApplicationDraftSchema", () => {
  it("fills in defaults", () => {
    const result = ApplicationDraftSchema.parse(valid);
    expect(result.autofillFieldMap).toEqual({});
    expect(result.userEdits).toEqual({});
    expect(result.status).toBe("reviewed");
  });

  it("validates the nested vettingSnapshot against VettingResultSchema", () => {
    expect(() =>
      ApplicationDraftSchema.parse({
        ...valid,
        vettingSnapshot: { ...valid.vettingSnapshot, score: 200 },
      }),
    ).toThrow();
  });

  it("rejects an unknown status", () => {
    expect(() =>
      ApplicationDraftSchema.parse({ ...valid, status: "archived" }),
    ).toThrow();
  });

  it("accepts populated autofillFieldMap and userEdits", () => {
    const result = ApplicationDraftSchema.parse({
      ...valid,
      autofillFieldMap: { first_name: "legalName" },
      userEdits: { first_name: "Ada" },
    });
    expect(result.autofillFieldMap).toEqual({ first_name: "legalName" });
    expect(result.userEdits).toEqual({ first_name: "Ada" });
  });
});
