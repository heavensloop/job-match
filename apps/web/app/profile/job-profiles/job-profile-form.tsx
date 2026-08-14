"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const DEGREE_OPTIONS = [
  { value: "high_school", label: "High School" },
  { value: "associates", label: "Associate's" },
  { value: "bachelors", label: "Bachelor's" },
  { value: "masters", label: "Master's" },
  { value: "doctorate", label: "Doctorate" },
];

interface ExperienceField {
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  tools: string; // comma-separated in the UI, split into an array on save
  bullets: string; // one per line in the UI, split into an array on save
}

interface EducationField {
  degree: string;
  institution: string;
  field: string;
  startDate: string;
  endDate: string | null;
  description: string;
}

interface FormState {
  jobTitle: string;
  bio: string;
  skills: string[];
  linkedin: string;
  github: string;
  twitter: string;
  experiences: ExperienceField[];
  education: EducationField[];
}

const EMPTY_FORM: FormState = {
  jobTitle: "",
  bio: "",
  skills: [],
  linkedin: "",
  github: "",
  twitter: "",
  experiences: [],
  education: [],
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: 6,
  boxSizing: "border-box" as const,
};

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: 4,
  padding: 12,
  marginBottom: 8,
};

export function JobProfileForm({ jobProfileId }: { jobProfileId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get("duplicate");
  const sourceId = jobProfileId ?? duplicateFrom;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading] = useState(Boolean(sourceId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceId) return;
    let cancelled = false;

    void (async () => {
      const res = await fetch(`/api/job-profiles/${sourceId}`);
      if (cancelled) return;
      if (!res.ok) {
        setError(`Failed to load: HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      const body = await res.json();
      if (cancelled) return;

      setForm({
        jobTitle: jobProfileId ? body.jobTitle : `${body.jobTitle} (copy)`,
        bio: body.bio ?? "",
        skills: body.skills,
        linkedin: body.socialLinks?.linkedin ?? "",
        github: body.socialLinks?.github ?? "",
        twitter: body.socialLinks?.twitter ?? "",
        experiences: body.experiences.map(
          (entry: (typeof body.experiences)[number]) => ({
            title: entry.title,
            company: entry.company,
            startDate: entry.startDate,
            endDate: entry.endDate,
            tools: entry.tools.join(", "),
            bullets: entry.bullets.join("\n"),
          }),
        ),
        education: body.education.map(
          (entry: (typeof body.education)[number]) => ({
            degree: entry.degree,
            institution: entry.institution,
            field: entry.field ?? "",
            startDate: entry.startDate,
            endDate: entry.endDate,
            description: entry.description ?? "",
          }),
        ),
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // sourceId only changes across full navigations (new id in the URL),
    // not on every keystroke — safe to depend on it alone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  function addSkill() {
    const value = skillInput.trim();
    if (!value) return;
    setForm((f) => ({ ...f, skills: [...f.skills, value] }));
    setSkillInput("");
  }

  function removeSkill(index: number) {
    setForm((f) => ({ ...f, skills: f.skills.filter((_, i) => i !== index) }));
  }

  function addExperience() {
    setForm((f) => ({
      ...f,
      experiences: [
        ...f.experiences,
        {
          title: "",
          company: "",
          startDate: "",
          endDate: null,
          tools: "",
          bullets: "",
        },
      ],
    }));
  }

  function updateExperience(index: number, patch: Partial<ExperienceField>) {
    setForm((f) => ({
      ...f,
      experiences: f.experiences.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  function removeExperience(index: number) {
    setForm((f) => ({
      ...f,
      experiences: f.experiences.filter((_, i) => i !== index),
    }));
  }

  function addEducation() {
    setForm((f) => ({
      ...f,
      education: [
        ...f.education,
        {
          degree: "bachelors",
          institution: "",
          field: "",
          startDate: "",
          endDate: null,
          description: "",
        },
      ],
    }));
  }

  function updateEducation(index: number, patch: Partial<EducationField>) {
    setForm((f) => ({
      ...f,
      education: f.education.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    }));
  }

  function removeEducation(index: number) {
    setForm((f) => ({
      ...f,
      education: f.education.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      jobTitle: form.jobTitle,
      bio: form.bio || undefined,
      skills: form.skills,
      socialLinks: {
        linkedin: form.linkedin || undefined,
        github: form.github || undefined,
        twitter: form.twitter || undefined,
      },
      experiences: form.experiences.map((entry) => ({
        title: entry.title,
        company: entry.company,
        startDate: entry.startDate,
        endDate: entry.endDate,
        tools: entry.tools
          .split(",")
          .map((tool) => tool.trim())
          .filter(Boolean),
        bullets: entry.bullets
          .split("\n")
          .map((bullet) => bullet.trim())
          .filter(Boolean),
      })),
      education: form.education.map((entry) => ({
        degree: entry.degree,
        institution: entry.institution,
        field: entry.field || undefined,
        startDate: entry.startDate,
        endDate: entry.endDate,
        description: entry.description || undefined,
      })),
    };

    const res = await fetch(
      jobProfileId ? `/api/job-profiles/${jobProfileId}` : "/api/job-profiles",
      {
        method: jobProfileId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    setSaving(false);
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      setError(errBody?.error ?? `Failed to save: HTTP ${res.status}`);
      return;
    }
    router.push("/profile/job-profiles");
  }

  if (loading) return <p>Loading…</p>;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
      <label style={{ display: "block", marginBottom: 8 }}>
        Job title
        <input
          value={form.jobTitle}
          onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
          required
          style={inputStyle}
        />
        <span style={{ fontSize: 12, color: "#777" }}>
          Also how you tell your job profiles apart — must be unique.
        </span>
      </label>
      <label style={{ display: "block", marginBottom: 12 }}>
        Bio
        <textarea
          value={form.bio}
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          rows={3}
          style={inputStyle}
        />
      </label>

      <h2 style={{ fontSize: 15 }}>Skills</h2>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}
      >
        {form.skills.map((skill, index) => (
          <span
            key={`${skill}-${index}`}
            style={{
              background: "#eee",
              borderRadius: 12,
              padding: "2px 8px",
              fontSize: 13,
            }}
          >
            {skill}{" "}
            <button
              type="button"
              onClick={() => removeSkill(index)}
              style={{ border: "none", background: "none", cursor: "pointer" }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkill();
            }
          }}
          placeholder="Add a skill"
          style={{ flex: 1, padding: 6 }}
        />
        <button type="button" onClick={addSkill}>
          Add
        </button>
      </div>

      <h2 style={{ fontSize: 15 }}>Social links (optional)</h2>
      <label style={{ display: "block", marginBottom: 8 }}>
        LinkedIn
        <input
          value={form.linkedin}
          onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))}
          placeholder="https://linkedin.com/in/…"
          style={inputStyle}
        />
      </label>
      <label style={{ display: "block", marginBottom: 8 }}>
        GitHub
        <input
          value={form.github}
          onChange={(e) => setForm((f) => ({ ...f, github: e.target.value }))}
          placeholder="https://github.com/…"
          style={inputStyle}
        />
      </label>
      <label style={{ display: "block", marginBottom: 16 }}>
        Twitter
        <input
          value={form.twitter}
          onChange={(e) => setForm((f) => ({ ...f, twitter: e.target.value }))}
          placeholder="https://twitter.com/…"
          style={inputStyle}
        />
      </label>

      <h2 style={{ fontSize: 15 }}>Experience</h2>
      {form.experiences.map((entry, index) => (
        <div key={index} style={cardStyle}>
          <label style={{ display: "block", marginBottom: 6 }}>
            Job title
            <input
              value={entry.title}
              onChange={(e) =>
                updateExperience(index, { title: e.target.value })
              }
              required
              style={inputStyle}
            />
          </label>
          <label style={{ display: "block", marginBottom: 6 }}>
            Company
            <input
              value={entry.company}
              onChange={(e) =>
                updateExperience(index, { company: e.target.value })
              }
              required
              style={inputStyle}
            />
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <label style={{ flex: 1 }}>
              Start (YYYY-MM)
              <input
                value={entry.startDate}
                onChange={(e) =>
                  updateExperience(index, { startDate: e.target.value })
                }
                placeholder="2024-01"
                required
                style={inputStyle}
              />
            </label>
            <label style={{ flex: 1 }}>
              End (YYYY-MM)
              <input
                value={entry.endDate ?? ""}
                onChange={(e) =>
                  updateExperience(index, { endDate: e.target.value })
                }
                placeholder="2024-06"
                disabled={entry.endDate === null}
                style={inputStyle}
              />
            </label>
          </div>
          <label style={{ display: "block", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={entry.endDate === null}
              onChange={(e) =>
                updateExperience(index, {
                  endDate: e.target.checked ? null : "",
                })
              }
            />{" "}
            I currently work here
          </label>
          <label style={{ display: "block", marginBottom: 6 }}>
            Tools/technologies (comma-separated)
            <input
              value={entry.tools}
              onChange={(e) =>
                updateExperience(index, { tools: e.target.value })
              }
              style={inputStyle}
            />
          </label>
          <label style={{ display: "block", marginBottom: 6 }}>
            Responsibilities/achievements (one per line)
            <textarea
              value={entry.bullets}
              onChange={(e) =>
                updateExperience(index, { bullets: e.target.value })
              }
              rows={3}
              style={inputStyle}
            />
          </label>
          <button type="button" onClick={() => removeExperience(index)}>
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addExperience}
        style={{ marginBottom: 16 }}
      >
        + Add experience
      </button>

      <h2 style={{ fontSize: 15 }}>Education</h2>
      {form.education.map((entry, index) => (
        <div key={index} style={cardStyle}>
          <label style={{ display: "block", marginBottom: 6 }}>
            Degree
            <select
              value={entry.degree}
              onChange={(e) =>
                updateEducation(index, { degree: e.target.value })
              }
              style={inputStyle}
            >
              {DEGREE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "block", marginBottom: 6 }}>
            Institution
            <input
              value={entry.institution}
              onChange={(e) =>
                updateEducation(index, { institution: e.target.value })
              }
              required
              style={inputStyle}
            />
          </label>
          <label style={{ display: "block", marginBottom: 6 }}>
            Field of study (optional)
            <input
              value={entry.field}
              onChange={(e) =>
                updateEducation(index, { field: e.target.value })
              }
              style={inputStyle}
            />
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <label style={{ flex: 1 }}>
              Start (YYYY-MM)
              <input
                value={entry.startDate}
                onChange={(e) =>
                  updateEducation(index, { startDate: e.target.value })
                }
                placeholder="2020-09"
                required
                style={inputStyle}
              />
            </label>
            <label style={{ flex: 1 }}>
              End (YYYY-MM)
              <input
                value={entry.endDate ?? ""}
                onChange={(e) =>
                  updateEducation(index, { endDate: e.target.value })
                }
                placeholder="2024-06"
                disabled={entry.endDate === null}
                style={inputStyle}
              />
            </label>
          </div>
          <label style={{ display: "block", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={entry.endDate === null}
              onChange={(e) =>
                updateEducation(index, {
                  endDate: e.target.checked ? null : "",
                })
              }
            />{" "}
            I currently study here
          </label>
          <label style={{ display: "block", marginBottom: 6 }}>
            Coursework/achievements (optional)
            <textarea
              value={entry.description}
              onChange={(e) =>
                updateEducation(index, { description: e.target.value })
              }
              rows={2}
              style={inputStyle}
            />
          </label>
          <button type="button" onClick={() => removeEducation(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={addEducation} style={{ marginBottom: 16 }}>
        + Add education
      </button>

      {error && <p style={{ color: "#b00020" }}>{error}</p>}

      <div>
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
