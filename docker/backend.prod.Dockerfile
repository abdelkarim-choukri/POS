# Production Dockerfile — multi-stage build for a small final image.
# Build with: docker build -f docker/backend.prod.Dockerfile -t pos-backend:prod .

FROM node:20-alpine AS builder

WORKDIR /workspace
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared

# Build shared package first, then backend
RUN pnpm --filter shared build && pnpm --filter backend build

# --- Final stage: minimal runtime image ---
FROM node:20-alpine

WORKDIR /app
RUN npm install -g pnpm

# Copy manifests and install ONLY production deps
COPY --from=builder /workspace/package.json ./
COPY --from=builder /workspace/pnpm-lock.yaml ./
COPY --from=builder /workspace/pnpm-workspace.yaml ./
COPY --from=builder /workspace/apps/backend/package.json ./apps/backend/
COPY --from=builder /workspace/packages/shared/package.json ./packages/shared/

RUN pnpm install --prod --frozen-lockfile

# Copy compiled output
COPY --from=builder /workspace/apps/backend/dist ./apps/backend/dist
COPY --from=builder /workspace/packages/shared/dist ./packages/shared/dist

# Drop privileges — run as the built-in node user
USER node

EXPOSE 3000
WORKDIR /app/apps/backend
CMD ["node", "dist/main.js"]
