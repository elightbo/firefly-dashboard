# ─────────────────────────────────────────────
# Stage 1: Build the frontend
# ─────────────────────────────────────────────
FROM node:24-alpine AS frontend-builder
WORKDIR /frontend

RUN corepack enable pnpm

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend/ .
RUN pnpm build

# ─────────────────────────────────────────────
# Stage 2: Compile the backend TypeScript
# ─────────────────────────────────────────────
FROM node:24-alpine AS backend-builder
WORKDIR /backend

RUN corepack enable pnpm

COPY backend/package.json backend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY backend/ .
RUN pnpm build

# ─────────────────────────────────────────────
# Stage 3: Production image
# ─────────────────────────────────────────────
FROM node:24-alpine
WORKDIR /app

RUN corepack enable pnpm

# Production dependencies only
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Compiled backend
COPY --from=backend-builder /backend/dist ./dist

# Migrations (needed for drizzle-kit migrate on first run)
COPY --from=backend-builder /backend/drizzle ./drizzle

# Built frontend served as static files by Fastify
COPY --from=frontend-builder /frontend/dist ./public

EXPOSE 3000

CMD ["node", "dist/index.js"]
