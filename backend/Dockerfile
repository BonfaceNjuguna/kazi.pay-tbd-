# syntax=docker/dockerfile:1.7

# ─── Stage 1: builder ─────────────────────────────────────────────────
# Installs every dependency (dev included) the backend needs to build,
# generates the Prisma client, compiles TypeScript → JS, then uses
# `pnpm deploy` to materialise a self-contained backend tree (sources
# + prod-only node_modules + generated Prisma client) under /out.
#
# Multi-stage so the runner image carries none of: pnpm, TS compiler,
# dev deps, source files (TS), tests, lint configs.
FROM node:20-alpine AS builder

# Native deps:
#   libc6-compat — Node prebuilt binaries linked against glibc
#   openssl       — Prisma engines + libssl
#   python3/make/g++ — bcrypt + other native node-gyp compiles
RUN apk add --no-cache libc6-compat openssl python3 make g++

ENV CI=true HUSKY=0 PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
# node-linker=hoisted: pnpm installs into a flat node_modules layout
# (no symlinks). Docker layer caching can then COPY node_modules across
# stages cleanly — pnpm's default isolated layout uses symlinks pointing
# at /repo/node_modules/.pnpm/... which don't resolve once moved.
ENV NPM_CONFIG_NODE_LINKER=hoisted

WORKDIR /repo
RUN corepack enable

# Copy manifests + lockfile + the Prisma schema together. Backend's
# postinstall (`prisma generate`) needs the schema present at install
# time; copying it here lets us keep postinstall enabled (which also
# fetches Prisma's engine binaries into the installed deps).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
COPY backend/prisma/ backend/prisma/
COPY frontend/package.json frontend/

# Install the whole workspace. `--filter "@perxli/backend..."` is what
# we'd prefer for build speed, but pnpm 9's filter + isolated layout
# leaves devDeps in the .pnpm store without the per-package symlinks
# the `tsc` build script expects. Installing everything is ~10s slower
# but predictable; the bloat is only in the builder stage anyway.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Now bring the rest of the backend source + the workspace-level
# tsconfig that backend/tsconfig.json extends from.
COPY tsconfig.base.json ./
COPY backend ./backend

# Build from the workspace root so pnpm resolves devDeps via the
# `.pnpm` store at /repo (where the install actually landed).
# Generate the Prisma client right after — the resulting client files
# under backend/node_modules ride along through the `pnpm deploy` below.
RUN pnpm --filter @perxli/backend build \
    && pnpm --filter @perxli/backend exec prisma generate

# ─── Stage 2: runner ─────────────────────────────────────────────────
# Slim production image: Node + OpenSSL + the backend bundle. We do a
# fresh `npm install --omit=dev` here instead of trying to ship pnpm's
# (symlinked) node_modules across stages. npm uses a flat layout that
# Just Works for ESM resolution, and the install is fast against
# Alpine's network without any cache mounts. The prisma client gets
# regenerated against this image's libc.
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV NODE_ENV=production PORT=3000

# Runtime artefacts from the builder.
COPY --from=builder --chown=node:node /repo/backend/package.json ./package.json
COPY --from=builder --chown=node:node /repo/backend/prisma       ./prisma
COPY --from=builder --chown=node:node /repo/backend/dist         ./dist

# Install prod deps + regenerate Prisma client against alpine.
# --ignore-scripts so the postinstall (prisma generate) doesn't fire
# during npm install; we run it explicitly with the version pinned
# in dependencies.
# npm install handles flat node_modules natively (no symlinks). Without
# a package-lock.json we resolve semver ranges fresh, which is OK
# because the same caret ranges are pinned by pnpm-lock.yaml that CI's
# typecheck + test already ran against.
# Postinstall (prisma generate) fires automatically — prisma CLI is in
# dependencies for exactly this reason.
RUN npm install --omit=dev --no-audit --no-fund \
    && rm -rf /root/.npm /root/.cache \
    && chown -R node:node /app

USER node

EXPOSE 3000

# Migrations run as a separate `docker compose run --rm backend npx
# prisma migrate deploy` step from the deploy workflow BEFORE this
# container starts — failures must be loud, not buried in container
# boot. Documented in ADR-006 + Phase 1.11.
CMD ["node", "dist/index.js"]
