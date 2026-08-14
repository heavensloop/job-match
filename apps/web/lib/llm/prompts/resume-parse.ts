import { z } from "zod";
import { EducationEntrySchema, WorkHistoryEntrySchema } from "@jobmatch/shared";

// What the LLM must return for a resume/LinkedIn parse. Web-App-only
// (decision #16: not shared with the Plugin) — a subset of the fields
// split across PersonSchema (legalName/email/phone/address) and
// JobProfileSchema (everything else); the client decides which target
// each field applies to when the user reviews/saves the parse result.
export const ResumeParseResultSchema = z.object({
  legalName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  skills: z.array(z.string()).default([]),
  experiences: z.array(WorkHistoryEntrySchema).default([]),
  education: z.array(EducationEntrySchema).default([]),
  certifications: z.array(z.string()).default([]),
  yearsOfExperience: z.number().nonnegative().optional(),
});
export type ResumeParseResult = z.infer<typeof ResumeParseResultSchema>;

const SYSTEM_PROMPT = `You extract structured data from a resume or LinkedIn data export. Respond with ONLY a single JSON object, no markdown code fences, no commentary before or after. The JSON must match exactly this shape:

{
  "legalName": "<string, omit if not found>",
  "email": "<string, omit if not found>",
  "phone": "<string, omit if not found>",
  "address": "<string, omit if not found>",
  "skills": ["<skill>", ...],
  "experiences": [
    { "title": "<job title>", "company": "<company>", "startDate": "YYYY-MM", "endDate": "YYYY-MM" or null if current, "tools": ["<tool or skill used in this role>", ...], "bullets": ["<bullet point describing what they did>", ...] }
  ],
  "education": [
    { "degree": one of "high_school" | "associates" | "bachelors" | "masters" | "doctorate" (pick the closest match), "institution": "<school>", "field": "<optional>", "startDate": "YYYY-MM", "endDate": "YYYY-MM" or null if still studying, "description": "<optional coursework/achievements>" }
  ],
  "certifications": ["<certification>", ...],
  "yearsOfExperience": <optional number, total years of professional experience>
}

Only extract what's actually present in the text — don't invent entries. Arrays should be empty, not omitted, when there's nothing to report. Every education entry needs a "degree" — pick the closest of the five allowed values even if the source text phrases it differently.`;

export function buildResumeParsePrompt(resumeText: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: resumeText,
  };
}
