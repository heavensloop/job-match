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

export const EducationEntrySchema = z.object({
  institution: z.string(),
  degree: z.string().optional(),
  field: z.string().optional(),
  graduationYear: z.number().int().optional(),
});
export type EducationEntry = z.infer<typeof EducationEntrySchema>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),

  // Identity
  legalName: z.string(),
  displayName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),

  // Resume source
  resumeBlobUrl: z.string().url().optional(),
  resumeText: z.string().optional(),

  // Structured LLM parse of the resume / LinkedIn export
  parsedSkills: z.array(z.string()).default([]),
  parsedWorkHistory: z.array(WorkHistoryEntrySchema).default([]),
  parsedEducation: z.array(EducationEntrySchema).default([]),
  parsedCertifications: z.array(z.string()).default([]),
  yearsOfExperience: z.number().nonnegative().optional(),

  // Autofill aliases: profile field key -> value an ATS form might expect
  // (e.g. legal name vs. preferred display name)
  autofillAliases: z.record(z.string(), z.string()).default({}),

  updatedAt: z.coerce.date(),
});
export type Profile = z.infer<typeof ProfileSchema>;
