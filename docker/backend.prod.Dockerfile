# Production Dockerfile — multi-stage build for a small final image.
# Build with: docker build -f docker/backend.prod.Dockerfile -t pos-backend:prod .

FROM node:20-alpine AS builder

WORKDIR /workspace

# Use China npm mirror for faster installs
RUN npm config set registry https://registry.npmmirror.com

# Copy workspace manifests first (better Docker layer caching)
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install ALL workspace deps (including dev — needed for the build step)
RUN npm ci

# Copy source for backend and shared
COPY apps/backend ./apps/backend
COPY packages/shared ./packages/shared

# Build shared package first, then backend
RUN npm run build --workspace=packages/shared && \
    npm run build --workspace=apps/backend

# --- Final stage: minimal runtime image ---
FROM node:20-alpine

WORKDIR /app

# Use China npm mirror for the prod-only install too
RUN npm config set registry https://registry.npmmirror.com

# Copy manifests
COPY --from=builder /workspace/package.json ./
COPY --from=builder /workspace/package-lock.json ./
COPY --from=builder /workspace/apps/backend/package.json ./apps/backend/
COPY --from=builder /workspace/packages/shared/package.json ./packages/shared/

# Install ONLY production deps for a small final image
RUN npm ci --omit=dev

# Copy compiled output
COPY --from=builder /workspace/apps/backend/dist ./apps/backend/dist
COPY --from=builder /workspace/packages/shared/dist ./packages/shared/dist

# Drop privileges — run as the built-in node user
USER node

EXPOSE 3000
WORKDIR /app/apps/backend
CMD ["node", "dist/main.js"]
