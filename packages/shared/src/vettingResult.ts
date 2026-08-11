import { z } from "zod";

export const GapSeveritySchema = z.enum(["low", "medium", "high"]);
export type GapSeverity = z.infer<typeof GapSeveritySchema>;

export const GapSchema = z.object({
  category: z.string(), // e.g. "years_of_experience", "required_skill", "location"
  description: z.string(),
  severity: GapSeveritySchema,
});
export type Gap = z.infer<typeof GapSchema>;

export const RecommendationSchema = z.enum([
  "strong_match",
  "possible_match",
  "poor_match",
]);
export type Recommendation = z.infer<typeof RecommendationSchema>;

// Shape of the LLM's structured vetting output. Not a Prisma table itself;
// persisted as JSON inside application_drafts.vetting_snapshot.
export const VettingResultSchema = z.object({
  score: z.number().min(0).max(100),
  recommendation: RecommendationSchema,
  summary: z.string(),
  strengths: z.array(z.string()).default([]),
  gaps: z.array(GapSchema).default([]),
});
export type VettingResult = z.infer<typeof VettingResultSchema>;
