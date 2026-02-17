FROM node:22-alpine AS base
RUN corepack enable pnpm
RUN apk add --no-cache python3 make g++ linux-headers

FROM base AS deps
WORKDIR /app
# Root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# ALL workspace package.json files so pnpm can resolve the workspace graph
COPY apps/voice/package.json     ./apps/voice/package.json
COPY apps/server/package.json    ./apps/server/package.json
COPY apps/web/package.json       ./apps/web/package.json
COPY apps/desktop/package.json   ./apps/desktop/package.json
COPY packages/shared/package.json ./packages/shared/package.json
# MEDIASOUP_SKIP_BUILD=true: download prebuilt worker binary (no C++ compile)
RUN MEDIASOUP_SKIP_BUILD=true \
    pnpm install --no-frozen-lockfile --filter @cordis/voice

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules          ./node_modules
COPY --from=deps /app/apps/voice/node_modules ./apps/voice/node_modules
COPY apps/voice ./apps/voice
COPY tsconfig.base.json ./
RUN pnpm --filter @cordis/voice build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# mediasoup worker needs these at runtime on Alpine
RUN apk add --no-cache python3 make g++ linux-headers

# Reuse compiled node_modules from deps stage (mediasoup already built)
COPY --from=deps /app/node_modules            ./node_modules
COPY --from=deps /app/apps/voice/node_modules ./apps/voice/node_modules
COPY --from=deps /app/package.json            ./package.json
COPY --from=deps /app/apps/voice/package.json ./apps/voice/package.json
COPY --from=builder /app/apps/voice/dist      ./apps/voice/dist

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "apps/voice/dist/main.js"]
