<div align="center">

# MinerSkills #10019

**Plataforma institucional da equipe mineira de robótica da FIRST Robotics Competition**

Escola SESI General Onésimo Becker de Araújo · SENAI Euvaldo Lodi · Belo Horizonte / Contagem — MG

</div>

---

## Início rápido

Pré-requisitos: **Node.js 22+** e (opcional) **Docker**.

```bash
# 1. copie a configuração (ÚNICO arquivo de config do projeto)
cp .env.example .env

# 2. instale, prepare o banco e popule com dados fictícios
npm run setup

# 3. suba a aplicação (API + front-end)
npm run dev
```

| Endereço | O quê |
| --- | --- |
| http://localhost:5173 | Site público |
| http://localhost:5173/admin | Painel administrativo (sem link no site) |
| http://localhost:3001/api/health | Healthcheck da API |

Credenciais iniciais do admin: definidas em `ADMIN_EMAIL` / `ADMIN_PASSWORD` no `.env`
(padrão `admin@minerskills.com.br` / `MinerSkills@10019` — **troque em produção**).

### Com Docker

```bash
docker compose up            # dev com hot reload (SQLite)
docker compose --profile postgres up   # + PostgreSQL

docker compose -f docker-compose.prod.yml up --build   # produção (nginx + API + Postgres)
```

Veja [docs/docker.md](docs/docker.md).

---

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Visão geral, stack, estrutura de pastas, decisões |
| [docs/env-reference.md](docs/env-reference.md) | **Todas** as variáveis do `.env` (arquivo único de config) |
| [docs/database.md](docs/database.md) | Modelo de dados e a troca **SQLite → PostgreSQL** |
| [docs/design-system.md](docs/design-system.md) | Identidade visual, tokens, componentes, motion |
| [docs/api.md](docs/api.md) | Mapa completo de rotas (públicas e admin) |
| [docs/security.md](docs/security.md) | Práticas e controles de segurança |
| [docs/uploads.md](docs/uploads.md) | Pipeline de upload de imagens e vídeos |
| [docs/testing.md](docs/testing.md) | Playwright (headless e headed) |
| [docs/docker.md](docs/docker.md) | Stacks de desenvolvimento e produção |
| [docs/pwa.md](docs/pwa.md) | Manifest, service worker e estratégias de cache |
| [docs/features/](docs/features/) | Um documento por tela/módulo |

---

## Scripts

| Script | O quê |
| --- | --- |
| `npm run setup` | Instala, gera o Prisma Client, cria o banco e popula |
| `npm run dev` | API (3001) + front-end (5173) com hot reload |
| `npm run build` | Build de produção de todos os workspaces |
| `npm run typecheck` | Checagem de tipos de todos os workspaces |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run db:push` | Sincroniza o schema com o banco (SQLite, dev) e garante as tags padrão da equipe |
| `npm run db:seed` | Popula o banco com dados fictícios |
| `npm run db:reset` | Recria o banco do zero e popula |
| `npm run db:studio` | Abre o Prisma Studio |
| `npm run db:migrate:deploy` | Aplica migrations (PostgreSQL) |
| `npm run test:e2e` | Testes end-to-end (headless) |
| `npm run test:e2e:headed` | Testes end-to-end com navegador visível |
| `npm run icons` | Regera os ícones do PWA a partir do selo da marca |

---

## O que a plataforma tem

**Público** — Landing animada (MinerSkills, FRC, FIRST, STEM) · História (timeline) ·
Blog (fotos, vídeos e embeds do YouTube) · Galeria (grid dinâmico + lightbox) ·
Equipe (membros e robôs, com tags gerenciadas pelo admin; filtros + painel de detalhe) ·
Quiz com leaderboard ·
Fórum moderado · Prêmios · Agenda · Como Entrar · Redes sociais.

**Administrativo** (`/admin`, sem link público) — Todo o conteúdo acima é gerenciável:
blog com editor rich-text, upload de mídia, galeria, perguntas do quiz, equipe e suas tags,
fila de moderação do fórum, prêmios, agenda, textos das páginas, timeline e redes sociais.

---

## Stack

**Front-end** Vite · React · TypeScript · SCSS · React Router · TanStack Query · Motion · lucide-react · TipTap · PWA
**Back-end** Node.js · Express · TypeScript · Prisma · Zod · JWT (jose) · Helmet · Sharp
**Banco** SQLite (dev) → PostgreSQL (produção), sem mudança de código
**Infra** Docker · Nginx · Playwright

---

## Licença

Projeto da equipe MinerSkills #10019. Todos os direitos reservados.
