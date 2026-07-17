# ─────────────────────────────────────────────────────────────
#  MinerSkills API — imagem multi-stage (dev + prod)
#  A API roda via tsx (mesmo runtime em dev e prod), então o
#  pacote @minerskills/shared é consumido direto do TypeScript.
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
# openssl: exigido pelo Prisma. libc6-compat: sharp/prisma engines.
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=development

# manifests primeiro (cache de camadas do npm)
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace @minerskills/api --workspace @minerskills/shared --include-workspace-root

# código-fonte
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
# o bit de execução não sobrevive ao checkout no Windows
RUN chmod +x /app/apps/api/docker-entrypoint.sh

# ─── DEV: hot reload via tsx watch ───────────────────────────
FROM base AS dev
WORKDIR /app/apps/api
EXPOSE 3001
ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

# ─── PROD ────────────────────────────────────────────────────
FROM base AS prod
ENV NODE_ENV=production
WORKDIR /app/apps/api
RUN npm run db:stamp && npx prisma generate
EXPOSE 3001
ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
