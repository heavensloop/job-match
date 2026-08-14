"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SearchCriteriaSummary {
  id: string;
  name: string;
  isDefault: boolean;
  workMode: string[];
  scope: string;
  employmentType: string[];
}

function labelize(value: string): string {
  return value.replace(/_/g, " ");
}

export function SearchCriteriaList() {
  const [criteria, setCriteria] = useState<SearchCriteriaSummary[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/search-criteria");
    if (!res.ok) {
      setError(`Failed to load: HTTP ${res.status}`);
      return;
    }
    const body = await res.json();
    setCriteria(body.searchCriteria);
  }

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const res = await fetch("/api/search-criteria");
      if (cancelled) return;
      if (!res.ok) {
        setError(`Failed to load: HTTP ${res.status}`);
        return;
      }
      const body = await res.json();
      if (!cancelled) setCriteria(body.searchCriteria);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this search criteria set? This can't be undone."))
      return;
    const res = await fetch(`/api/search-criteria/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(`Failed to delete: HTTP ${res.status}`);
      return;
    }
    void load();
  }

  if (error) return <p style={{ color: "#b00020" }}>{error}</p>;
  if (!criteria) return <p>Loading…</p>;

  return (
    <div>
      {criteria.length === 0 && <p>No search criteria yet.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {criteria.map((entry) => (
          <li
            key={entry.id}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid #ddd",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>
                <strong>{entry.name}</strong>
                {entry.isDefault && (
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
                <Link href={`/search-criteria/${entry.id}`}>Edit</Link>
                <button type="button" onClick={() => handleDelete(entry.id)}>
                  Delete
                </button>
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#777" }}>
              {entry.workMode.map(labelize).join(", ")} ·{" "}
              {labelize(entry.scope)} ·{" "}
              {entry.employmentType.map(labelize).join(", ")}
            </p>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 12 }}>
        <Link href="/search-criteria/new">+ New search criteria</Link>
      </p>
    </div>
  );
}
