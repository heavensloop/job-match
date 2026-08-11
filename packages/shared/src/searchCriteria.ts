import { z } from "zod";

export const WorkModeSchema = z.enum(["remote", "hybrid", "onsite"]);
export type WorkMode = z.infer<typeof WorkModeSchema>;

export const EmploymentTypeSchema = z.enum([
  "full_time",
  "part_time",
  "contract",
  "internship",
]);
export type EmploymentType = z.infer<typeof EmploymentTypeSchema>;

export const SearchScopeSchema = z.enum(["global_remote", "local_only"]);
export type SearchScope = z.infer<typeof SearchScopeSchema>;

export const SearchCriteriaSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),

  name: z.string(),
  isDefault: z.boolean().default(false),

  workMode: z.array(WorkModeSchema).min(1),
  scope: SearchScopeSchema,
  // Only meaningful when scope === "local_only"
  locations: z.array(z.string()).default([]),

  employmentType: z.array(EmploymentTypeSchema).min(1),

  minAnnualSalary: z.number().nonnegative().optional(),
  minHourlyRate: z.number().nonnegative().optional(),
  currency: z.string().length(3).default("USD"), // ISO 4217

  exclusions: z
    .object({
      keywords: z.array(z.string()).default([]),
      companies: z.array(z.string()).default([]),
    })
    .default({ keywords: [], companies: [] }),

  updatedAt: z.coerce.date(),
});
export type SearchCriteria = z.infer<typeof SearchCriteriaSchema>;
