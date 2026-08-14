import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestUser, deleteTestUser } from "@/test/db";
import { mockAuthModule, mockSessionUser } from "@/test/mock-auth";

vi.mock("@/auth", () => mockAuthModule());

const { POST } = await import("./route");

const URL = "http://localhost/api/profile/resume";

const minimalPdf = readFileSync(
  path.join(process.cwd(), "test/fixtures/minimal-resume.pdf"),
);

function pdfRequest(file?: Blob) {
  const formData = new FormData();
  if (file) formData.set("file", file, "resume.pdf");
  return new Request(URL, { method: "POST", body: formData });
}

let userId: string;

beforeEach(async () => {
  userId = (await createTestUser()).id;
  mockSessionUser(userId);
});

afterEach(async () => {
  await deleteTestUser(userId);
});

describe("POST /api/profile/resume", () => {
  it("401s without a session", async () => {
    mockSessionUser(null);
    const res = await POST(
      pdfRequest(new Blob([minimalPdf], { type: "application/pdf" })),
    );
    expect(res.status).toBe(401);
  });

  it("400s when no file is sent", async () => {
    const res = await POST(pdfRequest());
    expect(res.status).toBe(400);
  });

  it("400s when the file isn't a readable PDF", async () => {
    const res = await POST(
      pdfRequest(new Blob(["not a pdf"], { type: "application/pdf" })),
    );
    expect(res.status).toBe(400);
  });

  it("extracts text from a real PDF", async () => {
    const res = await POST(
      pdfRequest(new Blob([minimalPdf], { type: "application/pdf" })),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resumeText).toContain("Ada Lovelace Resume");
  });
});
