"use client";

import { useEffect, useRef, useState } from "react";
import { PAT_STORAGE_KEY } from "./pat-storage";

type Status = "connecting" | "connected" | "error";

interface TokenSummary {
  id: string;
  revokedAt: string | null;
}

const TOKEN_NAME = "Plugin";

// Temporary, verbose on purpose: tracing the connect handoff across the
// page → content script → background boundary while diagnosing why the
// Plugin sometimes doesn't pick up an auto-generated token.
const LOG = "[jobmatch:connect]";

// PATs are entirely system-managed here — no user-facing generate/list/
// revoke UI (decision from manual testing: that surface never needs a
// human, since the Plugin only ever needs "the current one"). On mount:
// revoke whatever's already active for this user, mint a replacement, and
// hand it to the Plugin via localStorage — same auto-handoff mechanism
// connect-bridge.ts (apps/plugin/src/connect-bridge.ts) already reads.
async function reconnect(): Promise<void> {
  console.log(LOG, "reconnect: listing existing tokens");
  const listRes = await fetch("/api/tokens");
  if (!listRes.ok)
    throw new Error(`Failed to list tokens: HTTP ${listRes.status}`);
  const { tokens } = (await listRes.json()) as { tokens: TokenSummary[] };

  const active = tokens.filter((token) => !token.revokedAt);
  console.log(LOG, `reconnect: revoking ${active.length} active token(s)`);
  await Promise.all(
    active.map((token) =>
      fetch(`/api/tokens/${token.id}`, { method: "DELETE" }),
    ),
  );

  console.log(LOG, "reconnect: creating new token");
  const createRes = await fetch("/api/tokens", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: TOKEN_NAME }),
  });
  if (!createRes.ok) {
    throw new Error(`Failed to create token: HTTP ${createRes.status}`);
  }
  const { token } = (await createRes.json()) as { token: string };
  console.log(LOG, `reconnect: got new token (${token.slice(0, 12)}…)`);

  localStorage.setItem(PAT_STORAGE_KEY, token);
  console.log(LOG, `reconnect: wrote to localStorage["${PAT_STORAGE_KEY}"]`);

  window.postMessage(
    { source: "jobmatch-web", type: "pat-available" },
    window.location.origin,
  );
  console.log(LOG, "reconnect: posted pat-available message");
}

export function PluginConnection() {
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Guards against React StrictMode's double-invoke in dev, which would
    // otherwise mint and immediately revoke a token on every page load.
    // No cancellation flag: `started` already ensures reconnect() only
    // ever runs once per mount, and setState after a real unmount is a
    // harmless no-op in React 18+ (nothing left to guard against).
    if (started.current) return;
    started.current = true;

    setStatus("connecting");
    console.log(LOG, "mount: starting reconnect()");

    reconnect()
      .then(() => {
        console.log(LOG, "reconnect: succeeded");
        setStatus("connected");
      })
      .catch((err: unknown) => {
        console.error(LOG, "reconnect: failed", err);
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });
  }, []);

  if (status === "connecting") return <p>Connecting the Plugin…</p>;

  if (status === "error") {
    return (
      <div>
        <p style={{ color: "#b00020" }}>Couldn&apos;t connect: {error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }

  return <p style={{ color: "#1a7a1a" }}>Plugin connected.</p>;
}
