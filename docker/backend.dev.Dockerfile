FROM node:20-alpine

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/

RUN npm install

EXPOSE 3000
WORKDIR /workspace/apps/backend
CMD ["npx", "nest", "start", "--watch"]
