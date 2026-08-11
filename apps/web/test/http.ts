export function jsonRequest(
  url: string,
  init?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  },
): Request {
  return new Request(url, {
    method: init?.method ?? "GET",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

export function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}
