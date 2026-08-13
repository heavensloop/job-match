# JobMatch Copilot

Detects job postings, scores them against your profile and search criteria
using an LLM, and autofills application forms. A browser extension
(`apps/plugin`) and a Next.js web app (`apps/web`) share domain types via
`packages/shared`.

**Status:** early scaffolding. `packages/shared` (Zod schemas), `apps/web`'s
Prisma schema, its `StorageAdapter`/`VercelBlobAdapter` port, NextAuth login,
personal access tokens, CRUD APIs for profile/search-criteria/job-board
sources, the pluggable LLM provider (`lib/llm`), the vetting/resume-parse
endpoints, and `apps/plugin`'s job detection + badge on LinkedIn/Greenhouse
(settings storage, PAT/LLM-key entry, sync loop, content script, badge)
all exist — but there's no Web App UI yet (no login page, no forms), and
the Plugin doesn't autofill anything yet. See [CLAUDE.md](CLAUDE.md) and
`.claude/plan.md` for the full design/decisions doc before making
architectural changes.

## Repo layout

```
apps/
  plugin/      MV3 browser extension, bundled with esbuild. Settings storage
               (chrome.storage.local), PAT/LLM-key/active-criteria entry
               popup, a background sync loop, and a content script that
               detects job pages on LinkedIn/Greenhouse and shows a score
               badge (JSON-LD -> Open Graph -> heading+CTA detection,
               lib/host-registry.ts). No autofill yet
  web/         Next.js app (App Router): Prisma schema, lib/storage
               (StorageAdapter port + VercelBlobAdapter), lib/llm
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

Set `DATABASE_URL` in that file to a real Postgres connection string before
running migrations or starting the app — the API routes need a live
database. `AUTH_SECRET` is required for NextAuth (`openssl rand -base64 32`).
`BLOB_READ_WRITE_TOKEN` is only needed once code actually calls
`getStorageAdapter()` (from `apps/web/lib/storage`) to read/write resume
blobs.

The Prisma client regenerates automatically after `npm install` (a
`postinstall` script) — you only need to run `prisma:generate` by hand after
pulling a schema change without a fresh install.

### Database (Prisma)

```bash
just web-prisma-validate   # check prisma/schema.prisma, no DB connection needed
just web-prisma-generate   # regenerate the Prisma client
just web-prisma-migrate    # apply/create migrations against DATABASE_URL
```

### Create a user

There's no public signup flow (decision #5: a few trusted testers, not
general-purpose SaaS auth). Provision accounts directly:

```bash
npm run create-user --workspace=apps/web -- <email> <password>
```

### Run the web app

```bash
just web-dev     # next dev, http://localhost:3000
just web-build   # next build
```

### Load the Plugin

```bash
just plugin-build   # esbuild -> apps/plugin/dist/
```

Then in Chrome/Edge: `chrome://extensions` → enable Developer mode → "Load
unpacked" → select `apps/plugin/dist`. `just plugin-dev` runs the same build
in esbuild's `--watch` mode; reload the extension in `chrome://extensions`
after each rebuild (esbuild writes the files, it doesn't reload the browser
for you).

In the popup: paste in a PAT (`just web-create-user` an account, log in, then
issue one via `POST /api/tokens` — there's no PAT-management UI yet) and an
LLM key, then Save. `manifest.json`'s `host_permissions` currently only
covers `localhost:3000`/`localhost:3100`; update it before pointing the
Plugin at a deployed Web App.

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
| `just test`             | `npm run test --workspaces --if-present`          | Every workspace's test suite (needs the test DB) |
| `just plugin-build`     | `npm run build --workspace=apps/plugin`           | esbuild the extension to `apps/plugin/dist/`   |
| `just plugin-typecheck` | `npm run typecheck --workspace=apps/plugin`       | Typecheck just the Plugin                      |
| `just plugin-test`      | `npm run test --workspace=apps/plugin`            | Plugin tests (all unit, no DB involved)        |
| `just ci`               | —                                                  | Everything CI runs: format-check, lint, typecheck, prisma validate, test |

No root npm script wraps `just ci`; if you don't have `just` installed, run
the `npm run ...` commands above individually instead.

## API

All routes live under `apps/web/app/api`. Two auth methods, resolved by
`getAuthContext()` (`apps/web/lib/auth/context.ts`):

- **Session** (NextAuth cookie) — the logged-in Web App UI
- **PAT** (`Authorization: Bearer jmc_pat_...`) — the Plugin, issued via
  `POST /api/tokens`

| Route | Methods | Auth |
| --- | --- | --- |
| `/api/auth/[...nextauth]` | NextAuth handlers | — |
| `/api/tokens` | GET, POST | session only (a PAT can't mint more PATs) |
| `/api/tokens/[id]` | DELETE (revoke) | session only |
| `/api/profile` | GET, PUT | GET: session or PAT · PUT: session only |
| `/api/profile/parse` | POST | session only |
| `/api/search-criteria` | GET, POST | GET: session or PAT · POST: session only |
| `/api/search-criteria/[id]` | GET, PATCH, DELETE | session or PAT (GET) / session only (mutate) |
| `/api/job-board-sources` | GET, POST | session only |
| `/api/job-board-sources/[id]` | GET, PATCH, DELETE | session only |
| `/api/vet` | POST | session or PAT |
| `/api/jobs-seen` | GET | session or PAT |

Request/response bodies are validated against the Zod schemas in
`packages/shared`. A criteria set's `isDefault: true` is exclusive per user —
setting it on one unsets it on the others, in a transaction.

### LLM calls (`/api/vet`, `/api/profile/parse`)

Decision #18: the LLM call happens server-side, but the user's own key never
touches Postgres — it's read from the request, used once, and discarded.
Both endpoints require:

- `X-LLM-Provider: claude | openai | free` — which provider to call
  (`lib/llm/get-provider.ts`; `free` is Groq, serving open-weight models)
- `X-LLM-Api-Key: <the user's own key for that provider>`

`POST /api/vet` upserts a `jobs_seen` row for the job url (`sourceId: null`
if it wasn't already known from a crawl), then caches the result: a repeat
call with an unchanged profile and criteria set returns the existing
`application_drafts` row instead of paying for another LLM call. A response
that fails to parse as JSON, or doesn't match the expected schema, is a 502
(the LLM misbehaved), not a 400/500.

`POST /api/profile/parse` is stateless — it takes already-extracted resume
or LinkedIn-export text and returns a suggested structured parse; it doesn't
write to the profile. That happens separately, via `PUT /api/profile`, once
the user has reviewed the suggestion.

`GET /api/jobs-seen?url=` is the Plugin badge's "have I seen this before"
check (decision #22) — no LLM headers, just a `jobs_seen` lookup returning
`{ firstSeenAt: string | null }`.

## Testing

[Vitest](https://vitest.dev), one config per workspace. Two kinds of test,
distinguished by filename suffix so they can be run separately:

- **`*.unit.test.ts`** — pure functions, no database (password hashing, PAT
  generation, `nullsToUndefined`, error mapping, the `VercelBlobAdapter`
  against a mocked `@vercel/blob`, and every schema in `packages/shared`)
- **`*.feature.test.ts`** — everything that touches Postgres: every API
  route handler (called directly, not over HTTP), `lib/auth/context.ts`'s
  session/PAT resolution, and the `create-user` script (both as a direct
  function call and spawned as the real CLI subprocess)

Feature tests need a real database — copy the test env file and point it at
a *separate* database from your dev one (tests create/delete rows freely):

```bash
cp apps/web/.env.test.example apps/web/.env.test   # edit DATABASE_URL
createdb jobmatch_test                              # or your Postgres equivalent
DATABASE_URL=<the .env.test one> npx prisma migrate deploy --schema apps/web/prisma/schema.prisma
```

Route/auth feature tests mock `@/auth` (the NextAuth boundary) rather than
`lib/auth/context.ts`, so the real session-vs-PAT resolution logic still
runs under test — see `apps/web/test/mock-auth.ts`.

```bash
just test              # everything, every workspace (needs the test DB)
just web-test-unit      # apps/web unit tests only, no DB needed
just web-test-feature   # apps/web feature tests only
just shared-test         # packages/shared (all unit — no DB involved)
just plugin-test         # apps/plugin (all unit — no browser/DB involved)
```

`apps/plugin`'s tests run under Node, not a real browser — `test/mock-chrome.ts`
stubs just enough of `chrome.storage.local`/`chrome.storage.onChanged` (an
in-memory store) for `lib/storage.ts`/`lib/sync.ts`/`lib/vet-client.ts` to
run against, the same way LLM provider tests stub `fetch` rather than
hitting a real API. `lib/host-registry.ts`'s `detectJob()` builds fixture
`Document`s via jsdom (`// @vitest-environment jsdom` per test file) rather
than a live browser, checked against real Greenhouse/LinkedIn page
structure by hand, not automated.

Not yet covered: the Plugin doesn't autofill anything yet, so there's no
field-mapper testing (Playwright against static ATS fixtures) or crawler
fixture tests — both are still just plans, in `.claude/plan.md` §6. Job
detection is currently only verified against 2 hosts (LinkedIn, Greenhouse)
via the fixtures in `host-registry.unit.test.ts` — real-page correctness
for those and any additional hosts still needs the "manual matrix" §6
describes.

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main` and `dev`, against
a Postgres 16 service container: `npm ci`, Prettier check, ESLint, workspace
typecheck, Prisma schema validation, `prisma migrate deploy`, then the full
test suite.
