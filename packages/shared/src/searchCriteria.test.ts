import { describe, expect, it } from "vitest";
import { SearchCriteriaSchema } from "./searchCriteria";

const valid = {
  id: "8a2f6c9e-3f1a-4b2a-9c3d-1e2f3a4b5c6d",
  userId: "1a2b3c4d-5e6f-4789-abcd-ef0123456789",
  name: "Remote full-time",
  workMode: ["remote"],
  scope: "global_remote",
  employmentType: ["full_time"],
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("SearchCriteriaSchema", () => {
  it("fills in defaults for a minimal valid input", () => {
    const result = SearchCriteriaSchema.parse(valid);
    expect(result.isDefault).toBe(false);
    expect(result.locations).toEqual([]);
    expect(result.currency).toBe("USD");
    expect(result.exclusions).toEqual({ keywords: [], companies: [] });
  });

  it("rejects an empty workMode array", () => {
    expect(() =>
      SearchCriteriaSchema.parse({ ...valid, workMode: [] }),
    ).toThrow();
  });

  it("rejects an empty employmentType array", () => {
    expect(() =>
      SearchCriteriaSchema.parse({ ...valid, employmentType: [] }),
    ).toThrow();
  });

  it("rejects an unknown workMode value", () => {
    expect(() =>
      SearchCriteriaSchema.parse({ ...valid, workMode: ["hybrid-remote"] }),
    ).toThrow();
  });

  it("rejects a negative minAnnualSalary", () => {
    expect(() =>
      SearchCriteriaSchema.parse({ ...valid, minAnnualSalary: -1 }),
    ).toThrow();
  });

  it("rejects a currency code that isn't 3 letters", () => {
    expect(() =>
      SearchCriteriaSchema.parse({ ...valid, currency: "US" }),
    ).toThrow();
  });

  it("accepts explicit exclusions", () => {
    const result = SearchCriteriaSchema.parse({
      ...valid,
      exclusions: { keywords: ["crypto"], companies: ["Acme"] },
    });
    expect(result.exclusions).toEqual({
      keywords: ["crypto"],
      companies: ["Acme"],
    });
  });
});
