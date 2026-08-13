// Every call the Plugin makes to the Web App's API is PAT-authenticated
// (decision #12) — this is the one place that attaches the header, so
// future callers (vet, autofill mapping, etc.) don't each reimplement it.
export async function apiFetch(
  path: string,
  options: { apiBaseUrl: string; pat: string; init?: RequestInit },
): Promise<Response> {
  return fetch(`${options.apiBaseUrl}${path}`, {
    ...options.init,
    headers: {
      ...options.init?.headers,
      authorization: `Bearer ${options.pat}`,
    },
  });
}
