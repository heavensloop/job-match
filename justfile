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

# --- packages/shared ---------------------------------------------------------

shared-typecheck:
    npm run typecheck --workspace=packages/shared

# --- apps/web ----------------------------------------------------------------

web-dev:
    npm run dev --workspace=apps/web

web-build:
    npm run build --workspace=apps/web

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

# --- apps/plugin ---------------------------------------------------------------

plugin-build:
    npm run build --workspace=apps/plugin

plugin-dev:
    npm run dev --workspace=apps/plugin
