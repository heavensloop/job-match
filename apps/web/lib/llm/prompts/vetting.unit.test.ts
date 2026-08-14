import { describe, expect, it } from "vitest";
import { buildVettingPrompt } from "./vetting";
import type { JobProfile, Person, SearchCriteria } from "@jobmatch/shared";

const person: Person = {
  id: "8a2f6c9e-3f1a-4b2a-9c3d-1e2f3a4b5c6d",
  userId: "1a2b3c4d-5e6f-4789-abcd-ef0123456789",
  legalName: "Ada Lovelace",
  email: "ada@example.com",
  updatedAt: new Date("2026-01-01"),
};

const jobProfile: JobProfile = {
  id: "5e6f7081-9203-4b23-ef01-234567890123",
  personId: person.id,
  jobTitle: "Engineering",
  isDefault: true,
  skills: ["TypeScript", "Analytical Engines"],
  socialLinks: {},
  experiences: [
    {
      title: "Mathematician",
      company: "Analytical Engine Co.",
      startDate: "1843-01",
      endDate: null,
      tools: ["Analytical Engine", "Punch Cards"],
      bullets: ["Wrote the first algorithm intended for machine execution."],
    },
  ],
  education: [],
  certifications: [],
  autofillAliases: {},
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const criteria: SearchCriteria = {
  id: "2b3c4d5e-6f70-4890-bcde-f01234567890",
  userId: person.userId,
  name: "Remote full-time",
  isDefault: true,
  workMode: ["remote"],
  scope: "global_remote",
  locations: [],
  employmentType: ["full_time"],
  currency: "USD",
  exclusions: { keywords: [], companies: [] },
  updatedAt: new Date("2026-01-01"),
};

describe("buildVettingPrompt", () => {
  it("includes person, jobProfile, criteria, and job details in the user prompt", () => {
    const { userPrompt } = buildVettingPrompt({
      person,
      jobProfile,
      criteria,
      jobTitle: "Senior Engineer",
      company: "Acme Corp",
      jobDescriptionText: "We need someone who loves difference engines.",
    });

    expect(userPrompt).toContain("Ada Lovelace");
    expect(userPrompt).toContain("TypeScript, Analytical Engines");
    expect(userPrompt).toContain("Mathematician at Analytical Engine Co.");
    expect(userPrompt).toContain("Analytical Engine, Punch Cards");
    expect(userPrompt).toContain(
      "Wrote the first algorithm intended for machine execution.",
    );
    expect(userPrompt).toContain("Remote full-time");
    expect(userPrompt).toContain("Senior Engineer");
    expect(userPrompt).toContain("Acme Corp");
    expect(userPrompt).toContain("difference engines");
  });

  it("asks for JSON-only output in the system prompt", () => {
    const { systemPrompt } = buildVettingPrompt({
      person,
      jobProfile,
      criteria,
      jobTitle: "x",
      company: "y",
      jobDescriptionText: "z",
    });

    expect(systemPrompt).toContain("ONLY a single JSON object");
    expect(systemPrompt).toContain("strong_match");
  });
});
