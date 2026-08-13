import { describe, expect, it } from "vitest";
import { ProfileSchema } from "./profile";

const validProfile = {
  id: "8a2f6c9e-3f1a-4b2a-9c3d-1e2f3a4b5c6d",
  userId: "1a2b3c4d-5e6f-4789-abcd-ef0123456789",
  legalName: "Ada Lovelace",
  email: "ada@example.com",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ProfileSchema", () => {
  it("accepts a minimal valid profile and fills in defaults", () => {
    const result = ProfileSchema.parse(validProfile);
    expect(result.parsedSkills).toEqual([]);
    expect(result.parsedWorkHistory).toEqual([]);
    expect(result.parsedEducation).toEqual([]);
    expect(result.parsedCertifications).toEqual([]);
    expect(result.autofillAliases).toEqual({});
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("accepts a fully populated profile", () => {
    const result = ProfileSchema.parse({
      ...validProfile,
      displayName: "Ada",
      phone: "+1-555-0100",
      location: "London, UK",
      resumeBlobUrl: "https://blob.example.com/resumes/ada.pdf",
      resumeText: "Ada Lovelace — mathematician...",
      parsedSkills: ["Analytical Engines", "TypeScript"],
      parsedWorkHistory: [
        {
          title: "Mathematician",
          company: "Analytical Engine Co.",
          startDate: "1843-01",
          endDate: null,
          tools: ["Analytical Engine", "Punch Cards"],
          bullets: [
            "Wrote the first algorithm intended for machine execution.",
            "Designed a loom-based instruction set.",
          ],
        },
      ],
      parsedEducation: [
        { institution: "Home tutoring", degree: undefined, field: "Math" },
      ],
      parsedCertifications: ["N/A"],
      yearsOfExperience: 10,
      autofillAliases: { legalName: "Augusta Ada King" },
    });
    expect(result.parsedWorkHistory[0].endDate).toBeNull();
    expect(result.parsedWorkHistory[0].tools).toEqual([
      "Analytical Engine",
      "Punch Cards",
    ]);
    expect(result.parsedWorkHistory[0].bullets).toHaveLength(2);
    expect(result.yearsOfExperience).toBe(10);
  });

  it("defaults a work history entry's tools/bullets to empty arrays", () => {
    const result = ProfileSchema.parse({
      ...validProfile,
      parsedWorkHistory: [
        {
          title: "Mathematician",
          company: "Analytical Engine Co.",
          startDate: "1843-01",
          endDate: null,
        },
      ],
    });
    expect(result.parsedWorkHistory[0].tools).toEqual([]);
    expect(result.parsedWorkHistory[0].bullets).toEqual([]);
  });

  it("rejects an invalid email", () => {
    expect(() =>
      ProfileSchema.parse({ ...validProfile, email: "not-an-email" }),
    ).toThrow();
  });

  it("rejects a negative yearsOfExperience", () => {
    expect(() =>
      ProfileSchema.parse({ ...validProfile, yearsOfExperience: -1 }),
    ).toThrow();
  });

  it("rejects a missing required field", () => {
    const { legalName: _legalName, ...withoutLegalName } = validProfile;
    expect(() => ProfileSchema.parse(withoutLegalName)).toThrow();
  });
});
