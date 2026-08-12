import { z } from "zod";
import { EducationEntrySchema, WorkHistoryEntrySchema } from "@jobmatch/shared";

// What the LLM must return for a resume/LinkedIn parse. Web-App-only
// (decision #16: not shared with the Plugin) — the fields extractable from
// a resume, a subset of ProfileSchema.
export const ResumeParseResultSchema = z.object({
  legalName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  parsedSkills: z.array(z.string()).default([]),
  parsedWorkHistory: z.array(WorkHistoryEntrySchema).default([]),
  parsedEducation: z.array(EducationEntrySchema).default([]),
  parsedCertifications: z.array(z.string()).default([]),
  yearsOfExperience: z.number().nonnegative().optional(),
});
export type ResumeParseResult = z.infer<typeof ResumeParseResultSchema>;

const SYSTEM_PROMPT = `You extract structured data from a resume or LinkedIn data export. Respond with ONLY a single JSON object, no markdown code fences, no commentary before or after. The JSON must match exactly this shape:

{
  "legalName": "<string, omit if not found>",
  "email": "<string, omit if not found>",
  "phone": "<string, omit if not found>",
  "location": "<string, omit if not found>",
  "parsedSkills": ["<skill>", ...],
  "parsedWorkHistory": [
    { "title": "<job title>", "company": "<company>", "startDate": "YYYY-MM", "endDate": "YYYY-MM" or null if current, "tools": ["<tool or skill used in this role>", ...], "bullets": ["<bullet point describing what they did>", ...] }
  ],
  "parsedEducation": [
    { "institution": "<school>", "degree": "<optional>", "field": "<optional>", "graduationYear": <optional number> }
  ],
  "parsedCertifications": ["<certification>", ...],
  "yearsOfExperience": <optional number, total years of professional experience>
}

Only extract what's actually present in the text — don't invent entries. Arrays should be empty, not omitted, when there's nothing to report.`;

export function buildResumeParsePrompt(resumeText: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: resumeText,
  };
}
