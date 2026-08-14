import type { JobProfile, Person, SearchCriteria } from "@jobmatch/shared";

export interface VettingPromptInput {
  person: Person;
  jobProfile: JobProfile;
  criteria: SearchCriteria;
  jobTitle: string;
  company: string;
  jobDescriptionText: string;
}

const SYSTEM_PROMPT = `You are a job-matching assistant. Given a candidate's profile, their search criteria, and a job posting, score how well the job matches the candidate.

Respond with ONLY a single JSON object, no markdown code fences, no commentary before or after. The JSON must match exactly this shape:

{
  "score": <number 0-100>,
  "recommendation": "strong_match" | "possible_match" | "poor_match",
  "summary": "<1-3 sentence overview>",
  "strengths": ["<short strength>", ...],
  "gaps": [
    { "category": "<e.g. years_of_experience, required_skill, location>", "description": "<what's missing or a mismatch>", "severity": "low" | "medium" | "high" }
  ]
}

"strengths" and "gaps" may be empty arrays if there's nothing notable. Be specific and grounded in the actual profile and job text — don't invent skills or requirements that aren't there.`;

export function buildVettingPrompt(input: VettingPromptInput): {
  systemPrompt: string;
  userPrompt: string;
} {
  const {
    person,
    jobProfile,
    criteria,
    jobTitle,
    company,
    jobDescriptionText,
  } = input;

  const userPrompt = `## Candidate profile

Name: ${person.legalName}
Years of experience: ${jobProfile.yearsOfExperience ?? "unspecified"}
Skills: ${jobProfile.skills.join(", ") || "none listed"}
Work history:
${
  jobProfile.experiences
    .map((entry) => {
      const header = `- ${entry.title} at ${entry.company} (${entry.startDate} to ${entry.endDate ?? "present"})`;
      const tools = entry.tools.length ? ` — ${entry.tools.join(", ")}` : "";
      const bullets = entry.bullets.map((bullet) => `  - ${bullet}`).join("\n");
      return bullets ? `${header}${tools}\n${bullets}` : `${header}${tools}`;
    })
    .join("\n") || "none listed"
}
Education:
${
  jobProfile.education
    .map(
      (entry) =>
        `- ${entry.degree} ${entry.field ?? ""} — ${entry.institution}`,
    )
    .join("\n") || "none listed"
}

## Search criteria (${criteria.name})

Work mode: ${criteria.workMode.join(", ")}
Scope: ${criteria.scope}${criteria.locations.length ? ` (${criteria.locations.join(", ")})` : ""}
Employment type: ${criteria.employmentType.join(", ")}
Minimum annual salary: ${criteria.minAnnualSalary ?? "unspecified"} ${criteria.currency}
Minimum hourly rate: ${criteria.minHourlyRate ?? "unspecified"} ${criteria.currency}
Excluded keywords: ${criteria.exclusions.keywords.join(", ") || "none"}
Excluded companies: ${criteria.exclusions.companies.join(", ") || "none"}

## Job posting

Title: ${jobTitle}
Company: ${company}

${jobDescriptionText}`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}
