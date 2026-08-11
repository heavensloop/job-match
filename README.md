# JobMatch Copilot

Detects job postings, scores them against your profile and search criteria
using an LLM, and autofills application forms. A browser extension
(`apps/plugin`) and a Next.js web app (`apps/web`) share domain types via
`packages/shared`.

**Status:** early scaffolding. `packages/shared` (Zod schemas), `apps/web`'s
Prisma schema, its `StorageAdapter`/`VercelBlobAdapter` port, and a bare
Next.js App Router shell exist so far — no auth, no API routes, no real UI
yet. See [CLAUDE.md](CLAUDE.md) and `.claude/plan.md` for the full
design/decisions doc before making architectural changes.

## Repo layout

```
apps/
  plugin/      MV3 browser extension (not yet scaffolded)
  web/         Next.js app (App Router): Prisma schema, lib/storage
               (StorageAdapter port + VercelBlobAdapter)
packages/
  shared/      Zod domain schemas, no build step, consumed as source
```

## Prerequisites

- Node.js 20+ (CI runs on 22)
- npm 10+ (the only package manager this repo uses — no yarn/pnpm)
- PostgreSQL, only needed once you're running Prisma migrations against a
  real database (a schema-only `prisma validate` needs no live connection)
- [`just`](https://github.com/casey/just) (optional) — `brew install just`.
  Run `just` with no arguments to list all recipes.

## Getting started

```bash
npm install
```

### Configure `apps/web`

```bash
cp apps/web/.env.example apps/web/.env
```

Set `DATABASE_URL` in that file to a real Postgres connection string once
you're ready to generate the Prisma client or run migrations — it isn't
required just to validate the schema. `BLOB_READ_WRITE_TOKEN` is only needed
once code actually calls `getStorageAdapter()` (from `apps/web/lib/storage`)
to read/write resume blobs.

### Database (Prisma)

```bash
just web-prisma-validate   # check prisma/schema.prisma, no DB connection needed
just web-prisma-generate   # generate the Prisma client
just web-prisma-migrate    # apply/create migrations against DATABASE_URL
```

### Run the web app

```bash
just web-dev     # next dev, http://localhost:3000
just web-build   # next build
```

## Common commands

| `just` recipe        | npm equivalent                                  | What it does                                  |
| --------------------- | ------------------------------------------------ | ---------------------------------------------- |
| `just install`         | `npm install`                                     | Install all workspace dependencies             |
| `just lint`             | `npm run lint`                                    | ESLint across the repo                         |
| `just format`           | `npm run format`                                  | Prettier, writes changes (JS/TS only, not `.md`)|
| `just format-check`     | `npm run format:check`                            | Prettier, check only (used in CI)              |
| `just typecheck`        | `npm run typecheck`                               | `tsc --noEmit` in every workspace that has it  |
| `just shared-typecheck` | `npm run typecheck --workspace=packages/shared`   | Typecheck just the shared package              |
| `just web-prisma-validate` | `npm run prisma:validate --workspace=apps/web` | Validate the Prisma schema                     |
| `just ci`               | —                                                  | Runs format-check + lint + typecheck + prisma validate, same as CI |

No root npm script wraps `just ci`; if you don't have `just` installed, run
the four `npm run ...` commands above individually instead.

## Testing

No test suite exists yet. The plan for one — unit tests for Zod schemas and
field-mapper heuristics, Playwright integration tests against static ATS
fixtures, fixture-based crawler tests, and a manual test-site matrix — is
recorded in `.claude/plan.md` §6, to be implemented alongside the features
they cover.

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main` and `dev`:
`npm ci`, Prettier check, ESLint, workspace typecheck, and Prisma schema
validation. There's no test step yet since there's no test suite to run.
