import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // next-auth's env.js imports the bare specifier "next/server" (see
      // its own "@ts-expect-error Next.js does not yet correctly use the
      // package.json#exports field" comment) — Next's own bundler special-
      // cases that resolution, but plain Vite/Node ESM resolution doesn't,
      // since next's package.json has no "exports" map. Only needed for
      // tests that import @/auth unmocked (auth.feature.test.ts).
      "next/server": fileURLToPath(
        new URL("../../node_modules/next/server.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    testTimeout: 15000,
    server: {
      // Needed so the "next/server" alias above actually applies: Vitest
      // externalizes node_modules deps to Node's native ESM loader by
      // default, which skips Vite's resolver (and its aliases) entirely.
      deps: { inline: ["next-auth", "@auth/core"] },
    },
  },
});
