# Construir desde la raíz del repositorio: docker build -f apps/api/Dockerfile .
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api --no-audit --no-fund

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json package-lock.json ./
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npm run prisma:generate
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app/apps/api
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY apps/api/package.json ./
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
