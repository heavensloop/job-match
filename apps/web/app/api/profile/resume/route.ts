import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { getSessionUserId } from "@/lib/auth/context";
import {
  BadRequestError,
  handleApiError,
  unauthorized,
} from "@/lib/api/errors";

// Text extraction only — no DB write, no LLM call. The client follows up
// with POST /api/profile/parse (already stateless) to LLM-structure the
// returned text. Storing the original PDF via StorageAdapter is a
// follow-up, not done here (see plan). Web App UI only, session auth.
//
// Uses unpdf (a serverless-oriented PDF.js build with no worker-thread
// dependency) rather than pdf-parse — pdf-parse's underlying pdfjs-dist
// engine assumes a Web Worker is available and falls back to dynamically
// importing its worker script from a bundler-resolved path, which breaks
// under both Turbopack and webpack in Next.js Route Handlers.
export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return unauthorized();

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new BadRequestError("Missing PDF file");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let resumeText: string;
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const result = await extractText(pdf, { mergePages: true });
      resumeText = result.text;
    } catch {
      throw new BadRequestError("Could not read that PDF");
    }

    if (!resumeText.trim()) {
      throw new BadRequestError("No text found in that PDF");
    }

    return NextResponse.json({ resumeText });
  } catch (error) {
    return handleApiError(error);
  }
}
