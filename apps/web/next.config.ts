import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // packages/shared has no build step (decision #24); Next.js transpiles
  // it from source instead of expecting compiled output.
  transpilePackages: ["@jobmatch/shared"],
  // Don't auto-generate AGENTS.md/CLAUDE.md here — the repo already has a
  // root CLAUDE.md and a nested one would just be conflicting duplicate
  // guidance.
  agentRules: false,
};

export default nextConfig;
