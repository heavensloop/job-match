// Prisma returns `null` for absent optional fields; the shared Zod schemas
// (packages/shared) model absence as `undefined` instead. Convert at the
// DB-row boundary before parsing a row against its schema.
export function nullsToUndefined<T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T]: T[K] extends null ? undefined : T[K] } {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = value === null ? undefined : value;
  }
  return result as { [K in keyof T]: T[K] extends null ? undefined : T[K] };
}
