FROM node:22-alpine AS base
RUN corepack enable pnpm
# argon2 needs build tools for native compilation
RUN apk add --no-cache python3 make g++

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# ALL workspace package.json files so pnpm can resolve the workspace graph
COPY apps/server/package.json    ./apps/server/package.json
COPY apps/voice/package.json     ./apps/voice/package.json
COPY apps/web/package.json       ./apps/web/package.json
COPY apps/desktop/package.json   ./apps/desktop/package.json
COPY packages/shared/package.json ./packages/shared/package.json
# --no-frozen-lockfile: lockfile generated on Windows differs in optional
# platform-specific deps (argon2 prebuilts). CI enforces lockfile separately.
RUN pnpm install --no-frozen-lockfile --filter @cordis/server...

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY tsconfig.base.json ./
RUN pnpm --filter @cordis/shared build || true
RUN pnpm --filter @cordis/server build

# Production - copy node_modules from deps (no re-install)
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/apps/server/package.json ./apps/server/package.json
COPY --from=deps /app/packages/shared/package.json ./packages/shared/package.json

COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/server/src/db/migrations ./apps/server/dist/db/migrations

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["node", "apps/server/dist/main.js"]
