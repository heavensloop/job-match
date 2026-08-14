"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface JobProfileSummary {
  id: string;
  jobTitle: string;
  isDefault: boolean;
}

export function JobProfileList() {
  const [profiles, setProfiles] = useState<JobProfileSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/job-profiles");
    if (!res.ok) {
      setError(`Failed to load: HTTP ${res.status}`);
      return;
    }
    const body = await res.json();
    setProfiles(body.jobProfiles);
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const res = await fetch("/api/job-profiles");
      if (cancelled) return;
      if (!res.ok) {
        setError(`Failed to load: HTTP ${res.status}`);
        return;
      }
      const body = await res.json();
      if (!cancelled) setProfiles(body.jobProfiles);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this job profile? This can't be undone.")) return;
    const res = await fetch(`/api/job-profiles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(`Failed to delete: HTTP ${res.status}`);
      return;
    }
    void load();
  }

  if (error) return <p style={{ color: "#b00020" }}>{error}</p>;
  if (!profiles) return <p>Loading…</p>;

  return (
    <div>
      {profiles.length === 0 && <p>No job profiles yet.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {profiles.map((profile) => (
          <li
            key={profile.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid #ddd",
            }}
          >
            <span>
              <strong>{profile.jobTitle}</strong>
              {profile.isDefault && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 12,
                    color: "#1a7a1a",
                    border: "1px solid #1a7a1a",
                    borderRadius: 4,
                    padding: "0 4px",
                  }}
                >
                  Default
                </span>
              )}
            </span>
            <span style={{ display: "flex", gap: 8 }}>
              <Link href={`/profile/job-profiles/${profile.id}`}>Edit</Link>
              <Link href={`/profile/job-profiles/new?duplicate=${profile.id}`}>
                Duplicate
              </Link>
              <button type="button" onClick={() => handleDelete(profile.id)}>
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 12 }}>
        <Link href="/profile/job-profiles/new">+ New job profile</Link>
      </p>
    </div>
  );
}
