# ─────────────────────────────────────────────────────────────
#  MinerSkills Web — imagem multi-stage (dev + prod via nginx)
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN npm ci --workspace @minerskills/web --workspace @minerskills/shared --include-workspace-root

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# ─── DEV: Vite dev server com HMR ────────────────────────────
FROM base AS dev
WORKDIR /app/apps/web
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ─── BUILD ───────────────────────────────────────────────────
FROM base AS build
# Variáveis VITE_* precisam existir em BUILD TIME (são inlined no bundle).
# Vêm do .env único da raiz via build args do compose.
ARG VITE_API_URL=/api
ARG VITE_UPLOADS_URL=/uploads
ARG VITE_SITE_URL
ARG VITE_TEAM_NUMBER=10019
ARG VITE_TEAM_NAME=MinerSkills
ENV VITE_API_URL=$VITE_API_URL \
    VITE_UPLOADS_URL=$VITE_UPLOADS_URL \
    VITE_SITE_URL=$VITE_SITE_URL \
    VITE_TEAM_NUMBER=$VITE_TEAM_NUMBER \
    VITE_TEAM_NAME=$VITE_TEAM_NAME
WORKDIR /app/apps/web
# Os ícones do PWA são assets versionados (public/icons). Para regerá-los a
# partir do selo da marca: `npm run icons` na raiz (requer sharp).
RUN npm run build

# ─── PROD: nginx servindo o SPA + proxy da API ───────────────
FROM nginx:1.27-alpine AS prod
COPY apps/web/nginx-security.conf /etc/nginx/snippets/minerskills-security.conf
# Contexto http (map do user-agent dos bots de pré-visualização + upstream da
# API): conf.d/*.conf é incluído em ordem alfabética, então 00-map.conf entra
# antes do default.conf, que o referencia.
COPY apps/web/nginx-map.conf /etc/nginx/conf.d/00-map.conf
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
