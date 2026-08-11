import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // packages/shared has no build step (decision #24); Next.js transpiles
  // it from source instead of expecting compiled output.
  transpilePackages: ["@jobmatch/shared"],
};

export default nextConfig;
