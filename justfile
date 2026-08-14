# Cross-domain command runner for the jobmatch-copilot monorepo
# (apps/plugin, apps/web, packages/shared). Install with `brew install just`.
#
# Run `just` with no args to list recipes. Recipes assume npm workspaces
# (`npm install` at the repo root) have already been installed.

set shell := ["bash", "-cu"]

default:
    just --list

# --- repo-wide -------------------------------------------------------------

# Install all workspace dependencies
install:
    npm install

# Typecheck every workspace that defines a typecheck script
typecheck:
    npm run typecheck --workspaces --if-present

# Lint all js/ts files
lint:
    npm run lint

# Format all js/ts/json/md files in place
format:
    npm run format

# Check formatting without writing (used in CI)
format-check:
    npm run format:check

# Run every workspace's test suite (needs DATABASE_URL for apps/web's
# feature tests — see apps/web/.env.test.example)
test:
    npm run test --workspaces --if-present

# Everything CI runs, in one shot
ci: format-check lint typecheck web-prisma-validate test

# --- packages/shared ---------------------------------------------------------

shared-typecheck:
    npm run typecheck --workspace=packages/shared

shared-test:
    npm run test --workspace=packages/shared

# --- apps/web ----------------------------------------------------------------

web-dev:
    npm run dev --workspace=apps/web

web-build:
    npm run build --workspace=apps/web

web-start:
    npm run start --workspace=apps/web

web-typecheck:
    npm run typecheck --workspace=apps/web --if-present

# Validate prisma/schema.prisma without touching the database
web-prisma-validate:
    npm run prisma:validate --workspace=apps/web

# Regenerate the Prisma client from prisma/schema.prisma
web-prisma-generate:
    npm run prisma:generate --workspace=apps/web

# Apply pending migrations in dev, creating one if the schema changed
web-prisma-migrate:
    npm run prisma:migrate --workspace=apps/web

# Provision a trusted-tester account (no public signup flow, decision #5)
web-create-user email password:
    npm run create-user --workspace=apps/web -- {{ email }} {{ password }}

# All apps/web tests (needs DATABASE_URL — see .env.test.example)
web-test:
    npm run test --workspace=apps/web

# Pure-function tests only, no database needed
web-test-unit:
    npm run test:unit --workspace=apps/web

# DB-backed route/script tests only
web-test-feature:
    npm run test:feature --workspace=apps/web

# --- apps/plugin ---------------------------------------------------------------

plugin-build:
    npm run build --workspace=apps/plugin

plugin-dev:
    npm run dev --workspace=apps/plugin

plugin-typecheck:
    npm run typecheck --workspace=apps/plugin

plugin-test:
    npm run test --workspace=apps/plugin
