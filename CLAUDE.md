# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository is pre-implementation. The only content right now is
`.claude/plan.md`, the living design/decisions doc for JobMatch Copilot. No
`package.json`, source tree, or build tooling exists yet — the monorepo
layout, commands, and CI/deploy config described below are the *plan*, not
current fact. Once code lands, verify commands against the actual
`package.json` scripts before relying on this file, and update this section.

Read `.claude/plan.md` in full before starting implementation work — it is
the source of truth for scope and rationale. The notes below are a
condensed pointer into it, not a replacement.

## Build and run commands
Always use npm (not yarn) to run commands in the correct context — this is
an npm workspaces monorepo (`package-lock.json`, `npm run` throughout the
`justfile`).

## Git workflow

Create new feature branches from `main`, not from another feature branch
or from `dev` — `main` is the up-to-date integration branch new work
should fork from.

Always create a new branch for each feature or bugfix, and open a PR against `main` when ready for review. Use descriptive branch names (e.g., `feature/job-detection`, `bugfix/autofill-mapper`).

## What this is

A system that detects job postings, scores them against a person's profile
and search criteria using an LLM, and autofills application forms. Two
coordinated apps plus a shared package, npm workspaces, one repo:

- `apps/plugin` — MV3 browser extension (esbuild-bundled). Thin client
  only: page detection, score badge, autofill, review UI, "seen before"
  history flag. **No LLM calls of its own** — everything AI-related goes
  through the Web App's API.
- `apps/web` — Next.js app on Vercel (Prisma + NextAuth). Owns profile,
  search criteria, job board sources, resume/LinkedIn import, job board
  crawling, and all vetting (LLM) logic — including vetting requests
  triggered by the Plugin.
- `packages/shared` — Zod schemas only (Profile, SearchCriteria,
  JobBoardSource, ApplicationDraft, VettingResult), no build step, consumed
  as raw TypeScript source (`transpilePackages` in web, direct esbuild
  compile in plugin). Prompts and the job-host registry are NOT shared —
  each has exactly one consumer and stays local to it.

## Constraints that shape almost every implementation decision

These are load-bearing and easy to violate accidentally — check `.claude/plan.md` §3 (decisions log) before deviating from any of them:

- **Bring-your-own-key, never persisted server-side.** The user's LLM API
  key lives in `chrome.storage.local` (Plugin) or browser session state
  (Web App) only. It is never written to Postgres. It travels on every
  vetting/parsing request (header from Plugin, session value from Web App)
  and is used in-memory for that one request, then discarded. There is no
  "saved key" fallback — a missing key is a hard failure with a clear
  error, not a lookup. (Decision #18.)
- **No vetting at crawl time.** The crawler only discovers and dedupes
  listings into `jobs_seen`. Vetting (the LLM call) happens only when a
  human actually views a job, in the Plugin or the Web App, because that's
  the only time a key is available. Do not add eager/background scoring.
  (Decision #21.)
- **Crawler is public-pages-only, never authenticated.** No login, no
  browser automation against job boards or LinkedIn. LinkedIn import is via
  the official "download your data" export upload, not scraping.
  (Decisions #14, #20.)
- **Plugin/Web App split is strict.** If new functionality needs anything
  beyond detection, badge rendering, autofill, review, or the history
  hover, it belongs in the Web App, called via API — not implemented
  locally in the Plugin. (Decision #10.)
- **Multiple named search-criteria sets per user, one active at a time.**
  "Active" selection is local UI state in the Plugin
  (`chrome.storage.local`), not synced to Postgres. Each job board source
  belongs to exactly one criteria set. (Decisions #6, #7, #8.)
- **LLM provider is pluggable**: Claude, OpenAI, and an open/free provider
  (Groq/OpenRouter-style), selected per-user with their own key. Don't
  hardcode a single provider. (Decisions #19, #27.)
- **Object storage goes through a `StorageAdapter` port** (`put`/`get`/
  `delete`), with `VercelBlobAdapter` as the default implementation
  (mirrors the DI pattern used for the LLM provider). Don't call the
  Vercel Blob SDK directly from feature code. (Decision #29.)
- **Sync conflicts**: per-row `updated_at`, last-write-wins — no CRDT/merge
  logic needed. (Decision #9.)

## Domain model (Postgres via Prisma, mirrors the shared Zod schemas)

- `users`, `profiles` (1:1), `search_criteria` (1:many with user),
  `job_board_sources` (many:1 with search_criteria), `jobs_seen` (crawler
  dedup index, no scoring data), `application_drafts` (created on actual
  vetting; holds `vetting_snapshot`, `autofill_field_map`, `user_edits`,
  `status`), `personal_access_tokens` (Plugin auth).
- Full column-level detail is in `.claude/plan.md` §4 — read it before
  writing migrations or Prisma schema so field names/nullability match the
  plan rather than being re-derived from scratch.
- Auth: NextAuth for Web App login; a separate hashed, revocable PAT system
  for Plugin→API machine-to-machine calls (NextAuth cookie sessions don't
  cover extension requests). (Decision #12.)

## Suggested build order (from `.claude/plan.md` §7)

1. Shared package: Zod schemas, Prisma schema
2. Web App: `StorageAdapter` interface + `VercelBlobAdapter`
3. Web App: NextAuth, PAT issuance, CRUD API for profile/criteria/boards
4. Web App: vetting endpoint (stateless key passthrough) + resume/LinkedIn parse endpoint
5. Plugin shell: storage, PAT entry, key entry, sync loop
6. Plugin: job detection + badge on 2-3 hosts (start with Greenhouse + LinkedIn)
7. Plugin: autofill mapper + review UI + draft sync
8. Web App: crawler (discovery only) + job board CRUD
9. Web App: browsing/vetting crawled results
10. Plugin: history hover state
11. Polish: error states, key validation, export/import

## Testing plan (from `.claude/plan.md` §6, not yet implemented)

- Unit: Zod schemas, URL matchers, field-mapper heuristics, prompt output
  parsing against fixture JSON
- Integration: Playwright against static HTML fixtures (Greenhouse and
  Lever sample application forms) for autofill
- Crawler: fixture-based tests against saved public search-page HTML,
  not live requests in CI
- Manual matrix: 3-5 real ATS pages, tracked in `docs/test-sites.md`
