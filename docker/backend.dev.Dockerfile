# docker/backend.dev.Dockerfile
FROM node:20-alpine

# Set npm to use China mirror (faster install from China)
RUN npm config set registry https://registry.npmmirror.com

WORKDIR /workspace

# Copy root workspace manifest first
COPY package.json package-lock.json ./

# Copy workspace package.json files (needed for npm workspaces)
COPY apps/backend/package.json ./apps/backend/
# packages/shared doesn't exist yet — Phase 0 will create it.
# Once you scaffold it, uncomment:
# COPY packages/shared/package.json ./packages/shared/

# Install all workspace dependencies
RUN npm install

EXPOSE 3000

# Hot-reload via nest CLI watch mode
WORKDIR /workspace/apps/backend
CMD ["npx", "nest", "start", "--watch"]