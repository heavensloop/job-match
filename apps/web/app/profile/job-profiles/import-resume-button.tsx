"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  clearSessionLlmConfig,
  getSessionLlmConfig,
  sessionLlmHeaders,
  setSessionLlmConfig,
  type SessionLlmConfig,
} from "@/lib/llm-session";

export const RESUME_IMPORT_KEY = "jobmatch:resume-import";

type Status = "idle" | "needs-key" | "working";

export function ImportResumeButton() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [provider, setProvider] = useState("claude");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function importResume(file: File, llmConfig: SessionLlmConfig) {
    setStatus("working");
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    const extractRes = await fetch("/api/profile/resume", {
      method: "POST",
      body: formData,
    });
    if (!extractRes.ok) {
      const body = await extractRes.json().catch(() => null);
      setError(
        body?.error ?? `Couldn't read that PDF: HTTP ${extractRes.status}`,
      );
      setStatus("idle");
      return;
    }
    const { resumeText } = await extractRes.json();

    const parseRes = await fetch("/api/profile/parse", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...sessionLlmHeaders(llmConfig),
      },
      body: JSON.stringify({ text: resumeText }),
    });
    if (!parseRes.ok) {
      const body = await parseRes.json().catch(() => null);
      const message =
        body?.error ?? `Couldn't parse that resume: HTTP ${parseRes.status}`;
      if (body?.details?.code === "llm_auth_failed") {
        // The stored key was rejected by the provider — it's no good for
        // next time either, so drop it and let the user fix it instead of
        // dead-ending in the plain "Import from resume" button state.
        clearSessionLlmConfig();
        setApiKey("");
        setError(message);
        setStatus("needs-key");
        return;
      }
      setError(message);
      setStatus("idle");
      return;
    }
    const parsed = await parseRes.json();

    sessionStorage.setItem(RESUME_IMPORT_KEY, JSON.stringify(parsed));
    router.push("/profile/job-profiles/new?import=1");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    // Kept regardless of path so a later auth-failure retry (which reopens
    // the key form from inside importResume, not from here) has the file.
    pendingFileRef.current = file;

    const existingConfig = getSessionLlmConfig();
    if (existingConfig) {
      void importResume(file, existingConfig);
      return;
    }

    setStatus("needs-key");
  }

  function handleKeySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = pendingFileRef.current;
    if (!file) return;

    const config: SessionLlmConfig = {
      providerId: provider as SessionLlmConfig["providerId"],
      apiKey,
    };
    setSessionLlmConfig(config);
    void importResume(file, config);
  }

  if (status === "needs-key") {
    return (
      <div>
        <form
          onSubmit={handleKeySubmit}
          style={{
            display: "inline-flex",
            gap: 6,
            alignItems: "center",
            border: "1px solid #ddd",
            borderRadius: 4,
            padding: 6,
          }}
        >
          <span style={{ fontSize: 12, color: "#444" }}>
            LLM key to parse it:
          </span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="claude">Claude</option>
            <option value="openai">OpenAI</option>
            <option value="free">Free</option>
          </select>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API key"
            required
            autoComplete="off"
            style={{ padding: 4 }}
          />
          <button type="submit">Continue</button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setStatus("idle");
            }}
          >
            Cancel
          </button>
        </form>
        {error && (
          <p style={{ color: "#b00020", fontSize: 12, margin: "4px 0 0" }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <span>
      <label
        style={{
          cursor: status === "working" ? "default" : "pointer",
          opacity: status === "working" ? 0.6 : 1,
        }}
      >
        {status === "working" ? "Importing…" : "Import from resume"}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={status === "working"}
          style={{ display: "none" }}
        />
      </label>
      {error && (
        <p style={{ color: "#b00020", fontSize: 12, margin: "4px 0 0" }}>
          {error}
        </p>
      )}
    </span>
  );
}
