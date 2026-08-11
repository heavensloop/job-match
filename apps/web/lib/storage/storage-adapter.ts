// Port for blob storage (decision #29 in .claude/plan.md). Feature code
// (profile/resume upload, etc.) depends on this interface, never on a
// specific provider's SDK directly.

export type StorageInput =
  string | Buffer | Blob | ArrayBuffer | ReadableStream;

export interface StoragePutOptions {
  contentType?: string;
}

export interface StoredObject {
  key: string;
  url: string;
  contentType: string;
}

export interface StorageAdapter {
  put(
    key: string,
    data: StorageInput,
    options?: StoragePutOptions,
  ): Promise<StoredObject>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}
