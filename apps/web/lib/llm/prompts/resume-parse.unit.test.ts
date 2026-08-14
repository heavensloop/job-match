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

  it("asks for the headline and bio/about sections distinctly from experience titles", () => {
    const { systemPrompt } = buildResumeParsePrompt("anything");
    expect(systemPrompt).toContain("headline");
    expect(systemPrompt).toContain("About");
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
      headline: "Mathematician & Computing Pioneer",
      bio: "Mathematician and writer.",
      skills: ["Math"],
      yearsOfExperience: 12,
    });
    expect(result.legalName).toBe("Ada Lovelace");
    expect(result.headline).toBe("Mathematician & Computing Pioneer");
    expect(result.bio).toBe("Mathematician and writer.");
    expect(result.yearsOfExperience).toBe(12);
  });

  it("rejects an invalid email", () => {
    expect(() =>
      ResumeParseResultSchema.parse({ email: "not-an-email" }),
    ).toThrow();
  });

  it("treats an LLM-returned empty string as absent, same as omitting the field", () => {
    const result = ResumeParseResultSchema.parse({ headline: "", bio: "" });
    expect(result.headline).toBeUndefined();
    expect(result.bio).toBeUndefined();
  });
});
