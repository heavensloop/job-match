import { del, get, put } from "@vercel/blob";
import type {
  StorageAdapter,
  StorageInput,
  StoragePutOptions,
  StoredObject,
} from "./storage-adapter";

// Default StorageAdapter implementation (decision #29). Keys are Vercel Blob
// pathnames; addRandomSuffix is disabled so a given key always maps to the
// same object, and allowOverwrite lets re-uploads (e.g. a new resume) replace
// it in place.
export class VercelBlobAdapter implements StorageAdapter {
  constructor(private readonly token: string) {}

  async put(
    key: string,
    data: StorageInput,
    options?: StoragePutOptions,
  ): Promise<StoredObject> {
    const blob = await put(key, data, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: options?.contentType,
      token: this.token,
    });
    return { key: blob.pathname, url: blob.url, contentType: blob.contentType };
  }

  async get(key: string): Promise<Buffer | null> {
    const result = await get(key, { access: "public", token: this.token });
    if (!result || result.stream === null) return null;
    const arrayBuffer = await new Response(result.stream).arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(key: string): Promise<void> {
    await del(key, { token: this.token });
  }
}
