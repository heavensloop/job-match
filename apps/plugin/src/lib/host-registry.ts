// §5.1: which pages the content script treats as a job posting, and how it
// pulls a title/company/description out of one. Host patterns gate where
// the content script runs (mirrored in manifest.json's content_scripts
// matches) — extraction itself always goes through the same signal
// pipeline, so widening host coverage later needs no new scraping code as
// long as the target site emits JobPosting JSON-LD or Open Graph tags,
// which most ATS platforms already do for SEO.
export interface HostPattern {
  id: string;
  pattern: RegExp;
}

// Step 6 of the build order: start with Greenhouse + LinkedIn job view.
export const JOB_HOST_PATTERNS: HostPattern[] = [
  { id: "linkedin", pattern: /^https:\/\/[a-z]+\.linkedin\.com\/jobs\/view\// },
  {
    id: "greenhouse",
    pattern: /^https:\/\/(boards|job-boards)\.greenhouse\.io\/[^/]+\/jobs\/\d+/,
  },
];

export function matchHost(url: string): string | null {
  return JOB_HOST_PATTERNS.find((host) => host.pattern.test(url))?.id ?? null;
}

export interface DetectedJob {
  title: string;
  company: string;
  descriptionText: string;
}

// Tried in order: structured data first, then metadata, then a bare
// heading + "Apply" CTA heuristic as a last resort.
export function detectJob(doc: Document): DetectedJob | null {
  return (
    detectFromJsonLd(doc) ?? detectFromOpenGraph(doc) ?? detectFromHeading(doc)
  );
}

// Manual trigger only (the "Vet Page" button) — unlike detectJob(), which
// only runs automatically on an allow-listed host and requires an "Apply"
// CTA for its heading fallback, this is invoked by the user explicitly
// asserting "this is a job page," so it skips both gates and takes
// whatever title/body text the page has as a last resort.
export function detectJobLenient(doc: Document): DetectedJob | null {
  return detectJob(doc) ?? detectFromAnyPage(doc);
}

function detectFromAnyPage(doc: Document): DetectedJob | null {
  const title =
    doc.title.trim() || doc.querySelector("h1")?.textContent?.trim() || "";
  if (!title) return null;

  const descriptionText = extractBodyText(doc);
  if (!descriptionText) return null;

  return { title, company: metaContent(doc, "og:site_name"), descriptionText };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBodyText(doc: Document): string {
  const main = doc.querySelector("main, article") ?? doc.body;
  return (main?.textContent ?? "").replace(/\s+/g, " ").trim();
}

function metaContent(doc: Document, property: string): string {
  return (
    doc
      .querySelector(`meta[property="${property}"]`)
      ?.getAttribute("content")
      ?.trim() ?? ""
  );
}

function detectFromJsonLd(doc: Document): DetectedJob | null {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(script.textContent ?? "");
    } catch {
      continue;
    }

    for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
      const job = jobPostingFromJsonLd(node);
      if (job) return job;
    }
  }

  return null;
}

function jobPostingFromJsonLd(node: unknown): DetectedJob | null {
  if (typeof node !== "object" || node === null) return null;
  const record = node as Record<string, unknown>;
  if (record["@type"] !== "JobPosting") return null;

  const title = typeof record.title === "string" ? record.title.trim() : "";
  if (!title) return null;

  const description =
    typeof record.description === "string" ? stripHtml(record.description) : "";
  if (!description) return null;

  const org = record.hiringOrganization;
  const company =
    typeof org === "string"
      ? org.trim()
      : typeof org === "object" &&
          org !== null &&
          typeof (org as Record<string, unknown>).name === "string"
        ? ((org as Record<string, unknown>).name as string).trim()
        : "";

  return { title, company, descriptionText: description };
}

function detectFromOpenGraph(doc: Document): DetectedJob | null {
  const title = metaContent(doc, "og:title");
  if (!title) return null;

  const descriptionText =
    metaContent(doc, "og:description") || extractBodyText(doc);
  if (!descriptionText) return null;

  return { title, company: metaContent(doc, "og:site_name"), descriptionText };
}

function detectFromHeading(doc: Document): DetectedJob | null {
  const title = doc.querySelector("h1")?.textContent?.trim();
  if (!title) return null;

  const hasApplyCta = Array.from(doc.querySelectorAll("a, button")).some((el) =>
    /apply/i.test(el.textContent ?? ""),
  );
  if (!hasApplyCta) return null;

  const descriptionText = extractBodyText(doc);
  if (!descriptionText) return null;

  return { title, company: metaContent(doc, "og:site_name"), descriptionText };
}
