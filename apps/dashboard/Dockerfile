# ==============================================================================
# TraceGuard Dashboard — Production Dockerfile (Next.js 14)
# Multi-stage, non-root user, lightweight Alpine Linux
# ==============================================================================
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 1. Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/analyzer/package.json ./packages/analyzer/
COPY packages/scoring-engine/package.json ./packages/scoring-engine/
COPY packages/tracker-classifier/package.json ./packages/tracker-classifier/
COPY packages/ui/package.json ./packages/ui/
COPY apps/extension/package.json ./apps/extension/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# 2. Build the application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter @traceguard/shared-types build || true
RUN pnpm --filter @traceguard/dashboard build

# 3. Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=builder /app/apps/dashboard/.next ./apps/dashboard/.next
COPY --from=builder /app/apps/dashboard/package.json ./apps/dashboard/package.json
COPY --from=builder /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

WORKDIR /app/apps/dashboard

CMD ["npm", "run", "start"]
