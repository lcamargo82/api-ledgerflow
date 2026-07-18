# ============================================================
# ApiLedgerflow API - NestJS Dockerfile
# ============================================================

FROM node:22-alpine AS base

WORKDIR /usr/src/app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./

# ============================================================
# Development
# ============================================================

FROM base AS development

ENV NODE_ENV=development

RUN npm install

COPY . .

EXPOSE 3021

CMD ["sh", "-c", "npm run prisma:generate && npm run build && node dist/main.js"]

# ============================================================
# Build
# ============================================================

FROM base AS build

ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://api_ledgerflow:api_ledgerflow@localhost:5432/api_ledgerflow?schema=public

RUN npm ci --include=dev

COPY . .

RUN npm run prisma:generate \
    && npm run build \
    && test -f dist/main.js

# ============================================================
# Production dependencies
# ============================================================

FROM build AS production-deps

RUN npm prune --omit=dev

# ============================================================
# Production
# ============================================================

FROM node:22-alpine AS production

WORKDIR /usr/src/app

ENV NODE_ENV=production

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY --from=production-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma

EXPOSE 3021

CMD ["node", "dist/main.js"]
