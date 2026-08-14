import { describe, expect, it } from "vitest";
import { JobProfileSchema } from "./jobProfile";

const validJobProfile = {
  id: "8a2f6c9e-3f1a-4b2a-9c3d-1e2f3a4b5c6d",
  personId: "1a2b3c4d-5e6f-4789-abcd-ef0123456789",
  jobTitle: "Backend Engineering",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("JobProfileSchema", () => {
  it("accepts a minimal valid job profile and fills in defaults", () => {
    const result = JobProfileSchema.parse(validJobProfile);
    expect(result.skills).toEqual([]);
    expect(result.experiences).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.certifications).toEqual([]);
    expect(result.socialLinks).toEqual({});
    expect(result.autofillAliases).toEqual({});
    expect(result.isDefault).toBe(false);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("accepts a fully populated job profile", () => {
    const result = JobProfileSchema.parse({
      ...validJobProfile,
      bio: "Builds distributed systems.",
      isDefault: true,
      skills: ["TypeScript", "PostgreSQL"],
      socialLinks: {
        linkedin: "https://linkedin.com/in/ada",
        github: "https://github.com/ada",
      },
      experiences: [
        {
          title: "Engineer",
          company: "Analytical Engine Co.",
          startDate: "1843-01",
          endDate: null,
          tools: ["Analytical Engine", "Punch Cards"],
          bullets: [
            "Wrote the first algorithm intended for machine execution.",
          ],
        },
      ],
      education: [
        {
          degree: "bachelors",
          institution: "Home tutoring",
          field: "Mathematics",
          startDate: "1835-01",
          endDate: "1841-06",
          description: "Focused on analytical mechanics.",
        },
      ],
      certifications: ["N/A"],
      yearsOfExperience: 10,
      autofillAliases: { legalName: "Augusta Ada King" },
    });
    expect(result.experiences[0].endDate).toBeNull();
    expect(result.education[0].degree).toBe("bachelors");
    expect(result.education[0].endDate).toBe("1841-06");
    expect(result.socialLinks.linkedin).toBe("https://linkedin.com/in/ada");
  });

  it("accepts a still-studying education entry with a null endDate", () => {
    const result = JobProfileSchema.parse({
      ...validJobProfile,
      education: [
        {
          degree: "masters",
          institution: "Somewhere University",
          startDate: "2024-09",
          endDate: null,
        },
      ],
    });
    expect(result.education[0].endDate).toBeNull();
  });

  it("rejects an education entry with an invalid degree", () => {
    expect(() =>
      JobProfileSchema.parse({
        ...validJobProfile,
        education: [
          {
            degree: "phd", // not one of the enum values
            institution: "Somewhere University",
            startDate: "2024-09",
            endDate: null,
          },
        ],
      }),
    ).toThrow();
  });

  it("defaults a work history entry's tools/bullets to empty arrays", () => {
    const result = JobProfileSchema.parse({
      ...validJobProfile,
      experiences: [
        {
          title: "Engineer",
          company: "Analytical Engine Co.",
          startDate: "1843-01",
          endDate: null,
        },
      ],
    });
    expect(result.experiences[0].tools).toEqual([]);
    expect(result.experiences[0].bullets).toEqual([]);
  });

  it("rejects a negative yearsOfExperience", () => {
    expect(() =>
      JobProfileSchema.parse({ ...validJobProfile, yearsOfExperience: -1 }),
    ).toThrow();
  });

  it("rejects a missing required field", () => {
    const { jobTitle: _jobTitle, ...withoutJobTitle } = validJobProfile;
    expect(() => JobProfileSchema.parse(withoutJobTitle)).toThrow();
  });
});
