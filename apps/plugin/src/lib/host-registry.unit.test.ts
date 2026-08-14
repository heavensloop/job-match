// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { detectJob, detectJobLenient, matchHost } from "./host-registry";

function docFromHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("matchHost", () => {
  it("matches a LinkedIn job view url", () => {
    expect(matchHost("https://www.linkedin.com/jobs/view/12345")).toBe(
      "linkedin",
    );
  });

  it("matches a Greenhouse boards url", () => {
    expect(matchHost("https://boards.greenhouse.io/acme/jobs/6789012")).toBe(
      "greenhouse",
    );
  });

  it("matches the job-boards.greenhouse.io host too", () => {
    expect(
      matchHost("https://job-boards.greenhouse.io/acme/jobs/6789012"),
    ).toBe("greenhouse");
  });

  it("returns null for an unrelated url", () => {
    expect(matchHost("https://www.linkedin.com/feed/")).toBeNull();
    expect(matchHost("https://example.com/careers")).toBeNull();
  });
});

describe("detectJob", () => {
  it("extracts from JobPosting JSON-LD when present", () => {
    const doc = docFromHtml(`
      <html><head>
        <script type="application/ld+json">
          ${JSON.stringify({
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: "Senior Engineer",
            description: "<p>Loves <b>difference engines</b>.</p>",
            hiringOrganization: { "@type": "Organization", name: "Acme Corp" },
          })}
        </script>
      </head><body><h1>Ignored</h1></body></html>
    `);

    expect(detectJob(doc)).toEqual({
      title: "Senior Engineer",
      company: "Acme Corp",
      descriptionText: "Loves difference engines .",
    });
  });

  it("handles an array of JSON-LD nodes and a string hiringOrganization", () => {
    const doc = docFromHtml(`
      <html><head>
        <script type="application/ld+json">
          ${JSON.stringify([
            { "@type": "BreadcrumbList" },
            {
              "@type": "JobPosting",
              title: "Mathematician",
              description: "Wrote the first algorithm.",
              hiringOrganization: "Analytical Engine Co.",
            },
          ])}
        </script>
      </head><body></body></html>
    `);

    expect(detectJob(doc)).toEqual({
      title: "Mathematician",
      company: "Analytical Engine Co.",
      descriptionText: "Wrote the first algorithm.",
    });
  });

  it("ignores malformed JSON-LD and falls through to Open Graph", () => {
    const doc = docFromHtml(`
      <html><head>
        <script type="application/ld+json">not json</script>
        <meta property="og:title" content="Staff Engineer" />
        <meta property="og:site_name" content="Acme Corp" />
        <meta property="og:description" content="Build things." />
      </head><body></body></html>
    `);

    expect(detectJob(doc)).toEqual({
      title: "Staff Engineer",
      company: "Acme Corp",
      descriptionText: "Build things.",
    });
  });

  it("falls back to body text when og:description is missing", () => {
    const doc = docFromHtml(`
      <html><head>
        <meta property="og:title" content="Staff Engineer" />
      </head><body><main>  lots   of   details  </main></body></html>
    `);

    expect(detectJob(doc)).toEqual({
      title: "Staff Engineer",
      company: "",
      descriptionText: "lots of details",
    });
  });

  it("falls back to a heading + Apply CTA heuristic as a last resort", () => {
    const doc = docFromHtml(`
      <html><body>
        <h1>Founding Engineer</h1>
        <main>We need someone who ships.</main>
        <button>Apply now</button>
      </body></html>
    `);

    expect(detectJob(doc)).toEqual({
      title: "Founding Engineer",
      company: "",
      descriptionText: "We need someone who ships.",
    });
  });

  it("returns null when there's a heading but no Apply CTA", () => {
    const doc = docFromHtml(`
      <html><body><h1>Company blog post</h1><main>Some text.</main></body></html>
    `);

    expect(detectJob(doc)).toBeNull();
  });

  it("returns null when nothing on the page looks like a job posting", () => {
    const doc = docFromHtml(`<html><body><p>Nothing here.</p></body></html>`);
    expect(detectJob(doc)).toBeNull();
  });
});

describe("detectJobLenient", () => {
  it("still prefers structured data when present", () => {
    const doc = docFromHtml(`
      <html><head>
        <meta property="og:title" content="Staff Engineer" />
        <meta property="og:site_name" content="Acme Corp" />
        <meta property="og:description" content="Build things." />
      </head><body></body></html>
    `);

    expect(detectJobLenient(doc)).toEqual({
      title: "Staff Engineer",
      company: "Acme Corp",
      descriptionText: "Build things.",
    });
  });

  it("accepts a heading with no Apply CTA, unlike detectJob", () => {
    const doc = docFromHtml(`
      <html><body><h1>Company blog post</h1><main>Some text.</main></body></html>
    `);

    expect(detectJob(doc)).toBeNull();
    expect(detectJobLenient(doc)).toEqual({
      title: "Company blog post",
      company: "",
      descriptionText: "Some text.",
    });
  });

  it("falls back to document.title when there's no h1 either", () => {
    const doc = docFromHtml(`
      <html><head><title>Careers at Acme</title></head>
      <body><main>We're hiring across the board.</main></body></html>
    `);

    expect(detectJobLenient(doc)).toEqual({
      title: "Careers at Acme",
      company: "",
      descriptionText: "We're hiring across the board.",
    });
  });

  it("returns null when the page has no usable title or text at all", () => {
    const doc = docFromHtml(`<html><body></body></html>`);
    expect(detectJobLenient(doc)).toBeNull();
  });
});
