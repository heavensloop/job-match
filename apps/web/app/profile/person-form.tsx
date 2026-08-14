"use client";

import { useEffect, useState, type FormEvent } from "react";

interface PersonFields {
  legalName: string;
  displayName: string;
  email: string;
  phone: string;
  address: string;
}

const EMPTY: PersonFields = {
  legalName: "",
  displayName: "",
  email: "",
  phone: "",
  address: "",
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: 6,
  boxSizing: "border-box" as const,
};

export function PersonForm() {
  const [fields, setFields] = useState<PersonFields>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const res = await fetch("/api/person");
      if (cancelled) return;
      if (res.status === 404) {
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError(`Failed to load: HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      const body = await res.json();
      if (!cancelled) {
        setFields({
          legalName: body.legalName ?? "",
          displayName: body.displayName ?? "",
          email: body.email ?? "",
          phone: body.phone ?? "",
          address: body.address ?? "",
        });
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof PersonFields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setSavedAt(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/person", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        legalName: fields.legalName,
        displayName: fields.displayName || undefined,
        email: fields.email,
        phone: fields.phone || undefined,
        address: fields.address || undefined,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? `Failed to save: HTTP ${res.status}`);
      return;
    }
    setSavedAt(Date.now());
  }

  if (loading) return <p>Loading…</p>;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
      <label style={{ display: "block", marginBottom: 8 }}>
        Name
        <input
          value={fields.legalName}
          onChange={(e) => updateField("legalName", e.target.value)}
          required
          style={inputStyle}
        />
      </label>
      <label style={{ display: "block", marginBottom: 8 }}>
        Preferred display name (optional)
        <input
          value={fields.displayName}
          onChange={(e) => updateField("displayName", e.target.value)}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "block", marginBottom: 8 }}>
        Email
        <input
          type="email"
          value={fields.email}
          onChange={(e) => updateField("email", e.target.value)}
          required
          style={inputStyle}
        />
      </label>
      <label style={{ display: "block", marginBottom: 8 }}>
        Phone
        <input
          value={fields.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "block", marginBottom: 12 }}>
        Address
        <input
          value={fields.address}
          onChange={(e) => updateField("address", e.target.value)}
          style={inputStyle}
        />
      </label>

      {error && <p style={{ color: "#b00020" }}>{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
      {savedAt && (
        <span style={{ marginLeft: 8, color: "#1a7a1a" }}>Saved.</span>
      )}
    </form>
  );
}
