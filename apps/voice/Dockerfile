FROM node:22-alpine AS base
RUN corepack enable pnpm
# mediasoup build tools (needed even with prebuilts as fallback)
RUN apk add --no-cache python3 make g++ linux-headers

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/voice/package.json ./apps/voice/
# --no-frozen-lockfile: lockfile was generated on Windows (different platform
# optional deps). CI enforces lockfile integrity separately.
# MEDIASOUP_SKIP_BUILD=true: use prebuilt mediasoup worker binaries
# instead of compiling from C++ source (faster + more reliable in CI).
RUN MEDIASOUP_SKIP_BUILD=true \
    pnpm install --no-frozen-lockfile --filter @cordis/voice

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/voice/node_modules ./apps/voice/node_modules
COPY apps/voice ./apps/voice
COPY tsconfig.base.json ./
RUN pnpm --filter @cordis/voice build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# mediasoup worker binary needs these at runtime
RUN apk add --no-cache python3 make g++ linux-headers

# Copy pre-built node_modules from deps (avoids recompiling mediasoup)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/voice/node_modules ./apps/voice/node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/apps/voice/package.json ./apps/voice/package.json
COPY --from=builder /app/apps/voice/dist ./apps/voice/dist

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "apps/voice/dist/main.js"]
