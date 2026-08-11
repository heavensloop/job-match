export type {
  StorageAdapter,
  StorageInput,
  StoragePutOptions,
  StoredObject,
} from "./storage-adapter";
export { VercelBlobAdapter } from "./vercel-blob-adapter";

import type { StorageAdapter } from "./storage-adapter";
import { VercelBlobAdapter } from "./vercel-blob-adapter";

let defaultAdapter: StorageAdapter | undefined;

// DI wiring (decision #29): the app depends on StorageAdapter, this factory
// is the one place that picks the concrete implementation.
export function getStorageAdapter(): StorageAdapter {
  if (!defaultAdapter) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error(
        "BLOB_READ_WRITE_TOKEN is not set; cannot construct the default StorageAdapter",
      );
    }
    defaultAdapter = new VercelBlobAdapter(token);
  }
  return defaultAdapter;
}
