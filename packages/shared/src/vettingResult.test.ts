import { describe, expect, it } from "vitest";
import { VettingResultSchema } from "./vettingResult";

const valid = {
  score: 82,
  recommendation: "strong_match",
  summary: "Strong fit on skills, slightly under on years of experience.",
};

describe("VettingResultSchema", () => {
  it("fills in defaults for strengths/gaps", () => {
    const result = VettingResultSchema.parse(valid);
    expect(result.strengths).toEqual([]);
    expect(result.gaps).toEqual([]);
  });

  it("accepts populated gaps with severities", () => {
    const result = VettingResultSchema.parse({
      ...valid,
      gaps: [
        {
          category: "years_of_experience",
          description: "Wants 5+ years, resume shows 3",
          severity: "medium",
        },
      ],
    });
    expect(result.gaps[0].severity).toBe("medium");
  });

  it("rejects a score above 100", () => {
    expect(() => VettingResultSchema.parse({ ...valid, score: 101 })).toThrow();
  });

  it("rejects a score below 0", () => {
    expect(() => VettingResultSchema.parse({ ...valid, score: -1 })).toThrow();
  });

  it("rejects an unknown recommendation value", () => {
    expect(() =>
      VettingResultSchema.parse({ ...valid, recommendation: "maybe" }),
    ).toThrow();
  });

  it("rejects an unknown gap severity", () => {
    expect(() =>
      VettingResultSchema.parse({
        ...valid,
        gaps: [{ category: "x", description: "y", severity: "catastrophic" }],
      }),
    ).toThrow();
  });
});
