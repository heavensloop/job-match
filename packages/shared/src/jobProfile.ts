import { z } from "zod";

export const WorkHistoryEntrySchema = z.object({
  title: z.string(),
  company: z.string(),
  startDate: z.string(), // "YYYY-MM"
  endDate: z.string().nullable(), // null = current role
  tools: z.array(z.string()).default([]), // per-role tool/skill chips
  bullets: z.array(z.string()).default([]), // one entry per bullet point
});
export type WorkHistoryEntry = z.infer<typeof WorkHistoryEntrySchema>;

export const DegreeTypeSchema = z.enum([
  "high_school",
  "associates",
  "bachelors",
  "masters",
  "doctorate",
]);
export type DegreeType = z.infer<typeof DegreeTypeSchema>;

export const EducationEntrySchema = z.object({
  degree: DegreeTypeSchema,
  institution: z.string(),
  field: z.string().optional(),
  startDate: z.string(), // "YYYY-MM"
  endDate: z.string().nullable(), // null = still studying
  description: z.string().optional(),
});
export type EducationEntry = z.infer<typeof EducationEntrySchema>;

export const SocialLinksSchema = z
  .object({
    linkedin: z.string().url().optional(),
    github: z.string().url().optional(),
    twitter: z.string().url().optional(),
  })
  .default({});
export type SocialLinks = z.infer<typeof SocialLinksSchema>;

// One of a person's many job-application profiles — everything that's
// allowed to differ between e.g. a "Backend Engineering" profile and a
// "PM roles" profile. The constant identity (name/email/phone/address)
// lives on Person instead (person.ts), shared across every JobProfile.
export const JobProfileSchema = z.object({
  id: z.string().uuid(),
  personId: z.string().uuid(),

  // Doubles as the label a person uses to tell their profiles apart in a
  // list, so it must be unique per person (enforced at the DB level and
  // pre-checked in the API — see app/api/job-profiles).
  jobTitle: z.string(),
  bio: z.string().optional(),
  isDefault: z.boolean().default(false),

  skills: z.array(z.string()).default([]),
  socialLinks: SocialLinksSchema,
  experiences: z.array(WorkHistoryEntrySchema).default([]),
  education: z.array(EducationEntrySchema).default([]),
  certifications: z.array(z.string()).default([]),
  yearsOfExperience: z.number().nonnegative().optional(),

  resumeBlobUrl: z.string().url().optional(),
  resumeText: z.string().optional(),

  // Field key -> value an ATS form might expect (legal name vs. display name).
  autofillAliases: z.record(z.string(), z.string()).default({}),

  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type JobProfile = z.infer<typeof JobProfileSchema>;
