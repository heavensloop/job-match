import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import nextPluginConfig from "eslint-config-next";
import globals from "globals";

// eslint-config-next's rule sets are scoped to **/* by default; rescope them
// to apps/web only so React/JSX/Next rules don't apply to packages/shared.
const nextConfig = nextPluginConfig
  .filter((config) => config.files)
  .map((config) => ({
    ...config,
    files: config.files.map((pattern) => `apps/web/${pattern}`),
  }));

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/generated/**",
      "apps/web/prisma/migrations/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Convention: a leading underscore marks an intentionally-unused
      // binding (e.g. destructuring past a field, an unused handler arg).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  ...nextConfig,
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    settings: {
      next: {
        rootDir: "apps/web",
      },
    },
  },
  eslintConfigPrettier,
);
