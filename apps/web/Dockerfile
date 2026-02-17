FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
# --no-frozen-lockfile: lockfile generated on Windows differs in optional
# platform-specific deps (esbuild prebuilts). CI enforces lockfile separately.
RUN pnpm install --no-frozen-lockfile --filter @cordis/web...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
COPY tsconfig.base.json ./
ARG VITE_API_URL
ARG VITE_VOICE_URL
ARG VITE_GATEWAY_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_VOICE_URL=$VITE_VOICE_URL
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
RUN pnpm --filter @cordis/web build

# Serve with nginx
FROM nginx:alpine AS production
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
