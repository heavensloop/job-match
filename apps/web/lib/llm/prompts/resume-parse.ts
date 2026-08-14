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
  // The tagline shown right under the person's name (LinkedIn calls this
  // "Headline") — distinct from any individual experiences[].title. LLMs
  // sometimes return "" instead of omitting an absent optional field, so
  // both this and `bio` normalize that to undefined.
  headline: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  bio: z
    .string()
    .optional()
    .transform((v) => v || undefined),
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
  "headline": "<the short tagline/specialty line shown directly under the person's name, ABOVE their contact details — LinkedIn calls this field "Headline". It's SHORT (rarely more than one line) and NOT written in full sentences: often a job title or a list of specialties separated by pipes/commas, in whatever casing the document uses (e.g. "Senior Backend Engineer @ Acme", "Full-Stack Developer | React & Node", or "INTERNAL COMMUNICATIONS | EMPLOYEE ENGAGEMENT | STAKEHOLDER ENGAGEMENT"). Do NOT confuse this with "bio" below, even if bio also appears near the top — headline is never a full sentence. Not the same as any individual job title from the experience section either. Omit if there's no such tagline; do not invent one.>",
  "bio": "<the person's longer introductory paragraph, written in full sentences (often starting like "X professional with N years experience..." or "Experienced in..."). Usually appears BELOW the contact details and ABOVE the experience section. This is DIFFERENT from "headline" above — bio is prose, headline is a short tagline — don't let a few words from the start of this paragraph leak into "headline" instead, and don't leave this empty just because a headline was already found. Include the full paragraph, not just its first sentence. It may be unlabeled, or labeled "About", "Summary", "Bio", "Profile", "Personal Statement", "Career Summary", or "Objective". Omit (don't return an empty string) only if there's genuinely no such paragraph anywhere — don't invent one from scattered resume details.>",
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
