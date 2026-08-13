// esbuild's `define` (build.mjs) replaces this expression with a string
// literal at bundle time — no @types/node needed, just enough of a shape
// for tsc to accept the reference.
declare const process: { env: { WEB_APP_URL?: string } };

// Inlined at build time, sourced from apps/plugin/.env (WEB_APP_URL) —
// see build.mjs. Not user-configurable.
export const WEB_APP_URL = process.env.WEB_APP_URL ?? "http://localhost:3000";
