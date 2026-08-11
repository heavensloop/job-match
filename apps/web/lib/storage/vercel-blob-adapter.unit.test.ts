import { beforeEach, describe, expect, it, vi } from "vitest";
import { del, get, put } from "@vercel/blob";
import { VercelBlobAdapter } from "./vercel-blob-adapter";

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
}));

function streamOf(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

describe("VercelBlobAdapter", () => {
  const adapter = new VercelBlobAdapter("fake-token");

  beforeEach(() => {
    vi.mocked(put).mockReset();
    vi.mocked(get).mockReset();
    vi.mocked(del).mockReset();
  });

  it("put uploads with a stable, non-suffixed pathname and returns key/url", async () => {
    vi.mocked(put).mockResolvedValue({
      pathname: "resumes/user-1.pdf",
      url: "https://blob.example.com/resumes/user-1.pdf",
      contentType: "application/pdf",
    } as Awaited<ReturnType<typeof put>>);

    const result = await adapter.put("resumes/user-1.pdf", Buffer.from("x"), {
      contentType: "application/pdf",
    });

    expect(put).toHaveBeenCalledWith(
      "resumes/user-1.pdf",
      expect.anything(),
      expect.objectContaining({
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/pdf",
        token: "fake-token",
      }),
    );
    expect(result).toEqual({
      key: "resumes/user-1.pdf",
      url: "https://blob.example.com/resumes/user-1.pdf",
      contentType: "application/pdf",
    });
  });

  it("get returns the blob content as a Buffer", async () => {
    vi.mocked(get).mockResolvedValue({
      statusCode: 200,
      stream: streamOf("hello world"),
      headers: new Headers(),
      blob: {
        url: "https://blob.example.com/x",
        downloadUrl: "https://blob.example.com/x",
        pathname: "x",
        contentDisposition: "inline",
        cacheControl: "public",
        uploadedAt: new Date(),
        etag: "abc",
        contentType: "text/plain",
        size: 11,
      },
    } as Awaited<ReturnType<typeof get>>);

    const result = await adapter.get("x");
    expect(result?.toString("utf-8")).toBe("hello world");
  });

  it("get returns null when the blob doesn't exist", async () => {
    vi.mocked(get).mockResolvedValue(null);
    await expect(adapter.get("missing")).resolves.toBeNull();
  });

  it("delete forwards the key to del()", async () => {
    vi.mocked(del).mockResolvedValue(undefined);
    await adapter.delete("resumes/user-1.pdf");
    expect(del).toHaveBeenCalledWith("resumes/user-1.pdf", {
      token: "fake-token",
    });
  });
});
