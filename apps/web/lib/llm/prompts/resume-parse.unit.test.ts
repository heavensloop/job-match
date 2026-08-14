import { describe, expect, it } from "vitest";
import {
  ResumeParseResultSchema,
  buildResumeParsePrompt,
} from "./resume-parse";

describe("buildResumeParsePrompt", () => {
  it("passes the resume text through as the user prompt verbatim", () => {
    const { userPrompt } = buildResumeParsePrompt("Ada Lovelace — resume text");
    expect(userPrompt).toBe("Ada Lovelace — resume text");
  });

  it("asks for JSON-only output describing the expected shape", () => {
    const { systemPrompt } = buildResumeParsePrompt("anything");
    expect(systemPrompt).toContain("ONLY a single JSON object");
    expect(systemPrompt).toContain("experiences");
  });
});

describe("ResumeParseResultSchema", () => {
  it("fills in defaults for an empty result", () => {
    const result = ResumeParseResultSchema.parse({});
    expect(result.skills).toEqual([]);
    expect(result.experiences).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.certifications).toEqual([]);
  });

  it("accepts a fully populated result", () => {
    const result = ResumeParseResultSchema.parse({
      legalName: "Ada Lovelace",
      email: "ada@example.com",
      skills: ["Math"],
      yearsOfExperience: 12,
    });
    expect(result.legalName).toBe("Ada Lovelace");
    expect(result.yearsOfExperience).toBe(12);
  });

  it("rejects an invalid email", () => {
    expect(() =>
      ResumeParseResultSchema.parse({ email: "not-an-email" }),
    ).toThrow();
  });
});
