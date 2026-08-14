"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

const WORK_MODE_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

interface FormState {
  name: string;
  isDefault: boolean;
  workMode: string[];
  scope: string;
  locations: string[];
  employmentType: string[];
  minAnnualSalary: string;
  minHourlyRate: string;
  currency: string;
  exclusionKeywords: string[];
  exclusionCompanies: string[];
}

const EMPTY_FORM: FormState = {
  name: "",
  isDefault: false,
  workMode: [],
  scope: "global_remote",
  locations: [],
  employmentType: [],
  minAnnualSalary: "",
  minHourlyRate: "",
  currency: "USD",
  exclusionKeywords: [],
  exclusionCompanies: [],
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: 6,
  boxSizing: "border-box" as const,
};

function ChipList({
  values,
  onRemove,
  input,
  onInputChange,
  onAdd,
  placeholder,
}: {
  values: string[];
  onRemove: (index: number) => void;
  input: string;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  return (
    <>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}
      >
        {values.map((value, index) => (
          <span
            key={`${value}-${index}`}
            style={{
              background: "#eee",
              borderRadius: 12,
              padding: "2px 8px",
              fontSize: 13,
            }}
          >
            {value}{" "}
            <button
              type="button"
              onClick={() => onRemove(index)}
              style={{ border: "none", background: "none", cursor: "pointer" }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          style={{ flex: 1, padding: 6 }}
        />
        <button type="button" onClick={onAdd}>
          Add
        </button>
      </div>
    </>
  );
}

export function SearchCriteriaForm({
  searchCriteriaId,
}: {
  searchCriteriaId?: string;
}) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [locationInput, setLocationInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [loading, setLoading] = useState(Boolean(searchCriteriaId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchCriteriaId) return;
    let cancelled = false;

    void (async () => {
      const res = await fetch(`/api/search-criteria/${searchCriteriaId}`);
      if (cancelled) return;
      if (!res.ok) {
        setError(`Failed to load: HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      const body = await res.json();
      if (cancelled) return;

      setForm({
        name: body.name,
        isDefault: body.isDefault,
        workMode: body.workMode,
        scope: body.scope,
        locations: body.locations ?? [],
        employmentType: body.employmentType,
        minAnnualSalary:
          body.minAnnualSalary != null ? String(body.minAnnualSalary) : "",
        minHourlyRate:
          body.minHourlyRate != null ? String(body.minHourlyRate) : "",
        currency: body.currency,
        exclusionKeywords: body.exclusions?.keywords ?? [],
        exclusionCompanies: body.exclusions?.companies ?? [],
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [searchCriteriaId]);

  function toggleListValue(list: string[], value: string): string[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  function addLocation() {
    const value = locationInput.trim();
    if (!value) return;
    setForm((f) => ({ ...f, locations: [...f.locations, value] }));
    setLocationInput("");
  }

  function removeLocation(index: number) {
    setForm((f) => ({
      ...f,
      locations: f.locations.filter((_, i) => i !== index),
    }));
  }

  function addKeyword() {
    const value = keywordInput.trim();
    if (!value) return;
    setForm((f) => ({
      ...f,
      exclusionKeywords: [...f.exclusionKeywords, value],
    }));
    setKeywordInput("");
  }

  function removeKeyword(index: number) {
    setForm((f) => ({
      ...f,
      exclusionKeywords: f.exclusionKeywords.filter((_, i) => i !== index),
    }));
  }

  function addCompany() {
    const value = companyInput.trim();
    if (!value) return;
    setForm((f) => ({
      ...f,
      exclusionCompanies: [...f.exclusionCompanies, value],
    }));
    setCompanyInput("");
  }

  function removeCompany(index: number) {
    setForm((f) => ({
      ...f,
      exclusionCompanies: f.exclusionCompanies.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      name: form.name,
      isDefault: form.isDefault,
      workMode: form.workMode,
      scope: form.scope,
      locations: form.scope === "local_only" ? form.locations : [],
      employmentType: form.employmentType,
      minAnnualSalary: form.minAnnualSalary
        ? Number(form.minAnnualSalary)
        : undefined,
      minHourlyRate: form.minHourlyRate
        ? Number(form.minHourlyRate)
        : undefined,
      currency: form.currency,
      exclusions: {
        keywords: form.exclusionKeywords,
        companies: form.exclusionCompanies,
      },
    };

    const res = await fetch(
      searchCriteriaId
        ? `/api/search-criteria/${searchCriteriaId}`
        : "/api/search-criteria",
      {
        method: searchCriteriaId ? "PATCH" : "POST",
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
    router.push("/search-criteria");
  }

  if (loading) return <p>Loading…</p>;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
      <label style={{ display: "block", marginBottom: 8 }}>
        Name
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
          style={inputStyle}
        />
      </label>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 16,
        }}
      >
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) =>
            setForm((f) => ({ ...f, isDefault: e.target.checked }))
          }
        />
        Set as default
      </label>

      <h2 style={{ fontSize: 15 }}>Work mode</h2>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {WORK_MODE_OPTIONS.map((option) => (
          <label
            key={option.value}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <input
              type="checkbox"
              checked={form.workMode.includes(option.value)}
              onChange={() =>
                setForm((f) => ({
                  ...f,
                  workMode: toggleListValue(f.workMode, option.value),
                }))
              }
            />
            {option.label}
          </label>
        ))}
      </div>

      <label style={{ display: "block", marginBottom: 8 }}>
        Scope
        <select
          value={form.scope}
          onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
          style={inputStyle}
        >
          <option value="global_remote">Global / remote</option>
          <option value="local_only">Local only</option>
        </select>
      </label>

      {form.scope === "local_only" && (
        <>
          <h2 style={{ fontSize: 15 }}>Locations</h2>
          <ChipList
            values={form.locations}
            onRemove={removeLocation}
            input={locationInput}
            onInputChange={setLocationInput}
            onAdd={addLocation}
            placeholder="Add a location"
          />
        </>
      )}

      <h2 style={{ fontSize: 15 }}>Employment type</h2>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}
      >
        {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
          <label
            key={option.value}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <input
              type="checkbox"
              checked={form.employmentType.includes(option.value)}
              onChange={() =>
                setForm((f) => ({
                  ...f,
                  employmentType: toggleListValue(
                    f.employmentType,
                    option.value,
                  ),
                }))
              }
            />
            {option.label}
          </label>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <label style={{ flex: 1 }}>
          Min annual salary (optional)
          <input
            type="number"
            min={0}
            value={form.minAnnualSalary}
            onChange={(e) =>
              setForm((f) => ({ ...f, minAnnualSalary: e.target.value }))
            }
            style={inputStyle}
          />
        </label>
        <label style={{ flex: 1 }}>
          Min hourly rate (optional)
          <input
            type="number"
            min={0}
            value={form.minHourlyRate}
            onChange={(e) =>
              setForm((f) => ({ ...f, minHourlyRate: e.target.value }))
            }
            style={inputStyle}
          />
        </label>
        <label style={{ width: 80 }}>
          Currency
          <input
            value={form.currency}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                currency: e.target.value.toUpperCase(),
              }))
            }
            maxLength={3}
            style={inputStyle}
          />
        </label>
      </div>

      <h2 style={{ fontSize: 15 }}>Excluded keywords</h2>
      <ChipList
        values={form.exclusionKeywords}
        onRemove={removeKeyword}
        input={keywordInput}
        onInputChange={setKeywordInput}
        onAdd={addKeyword}
        placeholder="Add a keyword to exclude"
      />

      <h2 style={{ fontSize: 15 }}>Excluded companies</h2>
      <ChipList
        values={form.exclusionCompanies}
        onRemove={removeCompany}
        input={companyInput}
        onInputChange={setCompanyInput}
        onAdd={addCompany}
        placeholder="Add a company to exclude"
      />

      {error && (
        <p style={{ color: "#b00020", fontSize: 13, marginBottom: 8 }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
