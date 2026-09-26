# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Audiência equilibrada, sem público prioritário (confirmado pelo responsável):

- Estudantes do SESI General Onésimo Becker de Araújo (BH) e do SENAI Euvaldo Lodi (Contagem) que podem entrar na equipe pelo processo seletivo.
- Pais e responsáveis avaliando o compromisso (12h+ semanais) e a seriedade do programa.
- Patrocinadores e empresas (hoje FIEMG, SESI, SENAI) avaliando visibilidade e impacto.
- Comunidade FIRST/FRC — outras equipes, mentores e juízes de prêmios — conhecendo a trajetória da equipe.

## Product Purpose

Plataforma institucional da MinerSkills #10019, equipe mineira da FIRST Robotics Competition. Apresenta a equipe, seus robôs, temporadas, prêmios e história; publica notícias; mantém agenda de competições, galeria, fórum da comunidade e um quiz; recebe inscrições no processo seletivo e mensagens de contato. Sucesso: quem chega entende rápido quem é a equipe e encontra o próximo passo que lhe cabe (inscrever-se, apoiar, acompanhar).

## Positioning

Equipe jovem (fundada em 2023, estreia na temporada 2024 "Crescendo") formada por alunos de SESI e SENAI em Minas Gerais, reconhecida com o Rising All-Star Award logo na estreia e patrocinada pela FIEMG. Constrói robôs de porte industrial.

## Operating Context

- Conteúdo 100% gerenciado por um painel admin (`/admin`): blocos de página, posts, temporadas, membros, prêmios, galeria, agenda, patrocinadores, quiz, fórum, mensagens.
- Blocos de conteúdo têm fallback de texto; qualquer seção pode vir sem imagem ou sem dados.
- PWA instalável e com modo offline; SEO por página com Open Graph.

## Capabilities and Constraints

- Monorepo: `apps/web` (React + Vite + SCSS com `@layer`, framer-motion, lucide-react, TanStack Query), `apps/api` (Express + Prisma, SQLite/Postgres), `packages/shared`, `e2e` (Playwright).
- Fontes self-hosted via `@fontsource` (CSP restrita, PWA offline) — nada de fontes por CDN.
- Todas as cores vivem em `apps/web/src/styles/_tokens.scss`; teste unitário reprova cor literal fora dele e verifica contraste (texto ≥ 4,5:1, contorno de controle ≥ 3:1).
- Cada folha SCSS declara sua camada de cascata; ordem das camadas espelhada no `index.html`.
- Suíte e2e depende de rótulos, papéis ARIA e estrutura; redesign não pode quebrar comportamento.
- O painel admin herda os tokens mas não está no escopo do redesign atual.

## Brand Commitments

- Nome "MinerSkills" e número "#10019" são fixos.
- Paleta: manter fundo escuro com verde como cor da marca (tons podem ser refinados, não precisam ser os atuais).
- Tom: sério, moderno e premium, com bastante movimento. Nada alternativo ou experimental.
- Referências de layout e movimento (não de paleta): Google Store (store.google.com) e Apple iPhone (apple.com/br/iphone): onde colocar informação, imagem, dados e estatísticas na tela, e quais elementos se movem e como. Adaptar para uma equipe de robótica, não copiar a lógica de loja.
- Geometria do logo em `apps/web/src/components/brand/paths.json` (fonte dos ícones PWA/OG).
- Idioma: português do Brasil. Terminologia FIRST: Gracious Professionalism, Coopertition, temporada, robô.

## Evidence on Hand

- Fatos reais: fundação 2023; temporada de estreia 2024 (Crescendo); Rising All-Star Award 2024; patrocínio FIEMG; escolas SESI/SENAI; 12h semanais de dedicação.
- Todo o resto no banco de desenvolvimento é fictício (faker/lorem + fotos picsum). Não inventar números, depoimentos, prêmios ou parceiros novos.
- Sem fotos reais da equipe no repositório; o design precisa funcionar com fotos de qualquer qualidade e sem foto.

## Product Principles

1. Cada visitante acha o seu próximo passo em até um scroll: inscrever-se, apoiar ou acompanhar.
2. Mostrar trabalho real (robôs, temporadas, prêmios) antes de adjetivos.
3. O conteúdo é do admin: o layout precisa se manter bonito com textos longos, curtos ou ausentes.
4. Rápido e funcional no celular e offline.

## Accessibility & Inclusion

WCAG 2.2 AA como piso (já verificado por testes de contraste e e2e): navegação por teclado, foco visível, `prefers-reduced-motion`, alvos de toque ≥ 44px, sem rolagem horizontal em 320px.
