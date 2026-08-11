import { describe, expect, it } from "vitest";
import { JobBoardSourceSchema } from "./jobBoardSource";

const valid = {
  id: "8a2f6c9e-3f1a-4b2a-9c3d-1e2f3a4b5c6d",
  criteriaId: "1a2b3c4d-5e6f-4789-abcd-ef0123456789",
  name: "Greenhouse remote eng",
  baseUrl: "https://boards.greenhouse.io/example",
  queryTemplate: "?department=engineering",
};

describe("JobBoardSourceSchema", () => {
  it("fills in defaults for a minimal valid input", () => {
    const result = JobBoardSourceSchema.parse(valid);
    expect(result.cadence).toBe("daily");
    expect(result.lastFetchedAt).toBeNull();
    expect(result.enabled).toBe(true);
  });

  it("rejects a non-URL baseUrl", () => {
    expect(() =>
      JobBoardSourceSchema.parse({ ...valid, baseUrl: "not-a-url" }),
    ).toThrow();
  });

  it("rejects an unknown cadence", () => {
    expect(() =>
      JobBoardSourceSchema.parse({ ...valid, cadence: "monthly" }),
    ).toThrow();
  });

  it("accepts an explicit lastFetchedAt", () => {
    const result = JobBoardSourceSchema.parse({
      ...valid,
      lastFetchedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.lastFetchedAt).toBeInstanceOf(Date);
  });
});
