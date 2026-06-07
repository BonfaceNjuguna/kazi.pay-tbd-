# syntax=docker/dockerfile:1.7

# ─── Stage 1: builder ─────────────────────────────────────────────────
# Installs deps + runs `vite build`. The bundle includes:
#   - VITE_GOOGLE_CLIENT_ID
#   - VITE_API_URL  (left empty so the SPA hits same-origin /api/v1)
#   - VITE_PUBLIC_BASE_URL
# all baked at build time via build-args (NOT runtime envs — Vite inlines
# them). That's why we publish separate prod and stage images even though
# the source code is identical.
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat

ENV CI=true HUSKY=0 PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Flat layout — same reason as backend (see backend/Dockerfile).
ENV NPM_CONFIG_NODE_LINKER=hoisted

WORKDIR /repo
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/
COPY backend/package.json backend/

# --ignore-scripts: backend's postinstall (prisma generate) would fire
# here too because pnpm install touches the whole workspace, and the
# Prisma schema isn't in the frontend build context. We're not building
# the backend in this image, so skipping all postinstall hooks is safe.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "@perxli/frontend..." --ignore-scripts

COPY tsconfig.base.json ./
COPY frontend ./frontend

# Build-time env that Vite inlines into the bundle. These are PUBLIC by
# design — anything VITE_-prefixed ships to the browser. Don't put
# secrets here.
ARG VITE_API_URL=""
ARG VITE_PUBLIC_BASE_URL=""
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_APP_NAME="Perxli"
ARG VITE_ENV="production"

ENV VITE_API_URL=$VITE_API_URL \
    VITE_PUBLIC_BASE_URL=$VITE_PUBLIC_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_ENV=$VITE_ENV

WORKDIR /repo/frontend
RUN pnpm build


# ─── Stage 2: runner ─────────────────────────────────────────────────
# NGINX serving the static Vite build. SPA fallback + sensible caching
# baked into nginx.conf below.
FROM nginx:1.27-alpine AS runner

# Drop the default site config; ours owns the server block.
RUN rm /etc/nginx/conf.d/default.conf

COPY frontend/nginx/spa.conf /etc/nginx/conf.d/spa.conf

COPY --from=builder /repo/frontend/dist /usr/share/nginx/html

# nginx:alpine listens on 80 inside the container. The host port binding
# happens in docker-compose (127.0.0.1:3001/3002 — see ADR-006).
EXPOSE 80

# Use the upstream entrypoint so signals + nginx -g 'daemon off;' Just Work.
