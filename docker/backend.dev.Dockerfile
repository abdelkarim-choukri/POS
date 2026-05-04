# docker/backend.dev.Dockerfile
FROM node:20-alpine

# Set npm to use China mirror (faster install from China)
RUN npm config set registry https://registry.npmmirror.com

WORKDIR /workspace

# Copy root workspace manifest first
COPY package.json package-lock.json ./

# Copy workspace package.json files (needed for npm workspaces)
COPY apps/backend/package.json ./apps/backend/
COPY packages/shared/package.json ./packages/shared/

# Install all workspace dependencies
RUN npm install

EXPOSE 3000

# Hot-reload via nest CLI watch mode
# Delete stale tsbuildinfo so TypeScript always emits a fresh build on startup.
# Without this, incremental mode sees a cached state but an empty dist/ and skips emission.
WORKDIR /workspace/apps/backend
CMD ["sh", "-c", "rm -f tsconfig.build.tsbuildinfo && npx nest start --watch"]