"use client";

import { useEffect, useState } from "react";

interface Gap {
  category: string;
  description: string;
  severity: "low" | "medium" | "high";
}

interface DraftDetail {
  id: string;
  status: string;
  createdAt: string;
  criteriaName: string;
  job: { title: string; company: string; url: string };
  vettingSnapshot: {
    score: number;
    recommendation: "strong_match" | "possible_match" | "poor_match";
    summary: string;
    strengths: string[];
    gaps: Gap[];
  };
}

const RECOMMENDATION_LABEL: Record<string, string> = {
  strong_match: "Strong match",
  possible_match: "Possible match",
  poor_match: "Poor match",
};

const RECOMMENDATION_COLOR: Record<string, string> = {
  strong_match: "#1a7a1a",
  possible_match: "#a66a00",
  poor_match: "#b00020",
};

const SEVERITY_COLOR: Record<string, string> = {
  high: "#b00020",
  medium: "#a66a00",
  low: "#777",
};

export function ApplicationDraftDetail({
  applicationDraftId,
}: {
  applicationDraftId: string;
}) {
  const [draft, setDraft] = useState<DraftDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const res = await fetch(`/api/application-drafts/${applicationDraftId}`);
      if (cancelled) return;
      if (!res.ok) {
        setError(`Failed to load: HTTP ${res.status}`);
        return;
      }
      const body = await res.json();
      if (!cancelled) setDraft(body);
    })();

    return () => {
      cancelled = true;
    };
  }, [applicationDraftId]);

  if (error) return <p style={{ color: "#b00020" }}>{error}</p>;
  if (!draft) return <p>Loading…</p>;

  const { job, vettingSnapshot: snapshot } = draft;

  return (
    <div>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>
        <a href={job.url} target="_blank" rel="noreferrer">
          {job.title}
        </a>
      </h1>
      <p style={{ color: "#444", marginTop: 0 }}>{job.company}</p>
      <p style={{ fontSize: 12, color: "#777" }}>
        Vetted against &ldquo;{draft.criteriaName}&rdquo;
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          margin: "16px 0",
        }}
      >
        <span style={{ fontSize: 32, fontWeight: "bold" }}>
          {snapshot.score}/100
        </span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: RECOMMENDATION_COLOR[snapshot.recommendation],
          }}
        >
          {RECOMMENDATION_LABEL[snapshot.recommendation]}
        </span>
      </div>

      <p>{snapshot.summary}</p>

      {snapshot.strengths.length > 0 && (
        <>
          <h2 style={{ fontSize: 15 }}>Strengths</h2>
          <ul style={{ paddingLeft: 20 }}>
            {snapshot.strengths.map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </>
      )}

      {snapshot.gaps.length > 0 && (
        <>
          <h2 style={{ fontSize: 15 }}>Gaps</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {snapshot.gaps.map((gap, index) => (
              <li
                key={index}
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid #ddd",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: SEVERITY_COLOR[gap.severity],
                  }}
                >
                  {gap.severity} · {gap.category.replace(/_/g, " ")}
                </span>
                <p style={{ margin: "2px 0 0" }}>{gap.description}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <p style={{ marginTop: 16, fontSize: 12, color: "#777" }}>
        Vetted {new Date(draft.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
