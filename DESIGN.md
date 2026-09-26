---
name: MinerSkills
description: Vitrine escura e verde da equipe FRC #10019, com lógica de layout e movimento de loja premium.
colors:
  bg: "#080b0a"
  surface: "#0f1412"
  surface-2: "#161d1a"
  surface-3: "#212a26"
  field-bg: "#0a0e0c"
  border-subtle: "rgba(255, 255, 255, 0.07)"
  border: "#232c28"
  border-strong: "#34403a"
  border-control: "#667470"
  green: "#29d98c"
  green-hover: "#3ee39b"
  green-deep: "#3b9c7a"
  green-soft: "rgba(41, 217, 140, 0.1)"
  on-green: "#04201a"
  text: "#f2f5f3"
  text-dim: "#a3afa9"
  text-faint: "#8f9993"
  text-disabled: "#6b756f"
  on-overlay: "#ffffff"
  danger: "#ff5a5a"
  warning: "#f2b134"
  info: "#5ab0ff"
typography:
  display:
    fontFamily: "'Geist Variable', 'Geist', system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  display-xl:
    fontFamily: "'Geist Variable', 'Geist', system-ui, sans-serif"
    fontSize: "clamp(3rem, 8.4vw, 6rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "'Geist Variable', 'Geist', system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.4vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  title:
    fontFamily: "'Geist Variable', 'Geist', system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title-sm:
    fontFamily: "'Geist Variable', 'Geist', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  lead:
    fontFamily: "'Geist Variable', 'Geist', system-ui, sans-serif"
    fontSize: "clamp(1.125rem, 1.5vw, 1.3125rem)"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "'Geist Variable', 'Geist', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "'ss01', 'cv11'"
  label:
    fontFamily: "'Geist Variable', 'Geist', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    letterSpacing: "0.01em"
  numeral:
    fontFamily: "'Geist Mono Variable', 'Geist Mono', ui-monospace, monospace"
    fontSize: "clamp(2.75rem, 5.2vw, 4.25rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "'tnum'"
rounded:
  sm: "8px"
  md: "12px"
  base: "20px"
  lg: "28px"
  xl: "36px"
  pill: "999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "2.5rem"
  "8": "3rem"
  "10": "4rem"
  "12": "6rem"
  gap-grid: "1.25rem"
  card-pad: "clamp(1.5rem, 2.6vw, 2.25rem)"
  section-y: "clamp(3rem, 5.5vw, 4.75rem)"
  section-x: "clamp(1.25rem, 4vw, 3.5rem)"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.pill}"
    padding: "0 1.5rem"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.green-hover}"
  button-primary-lg:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-green}"
    rounded: "{rounded.pill}"
    padding: "0 2rem"
    height: "52px"
  button-link:
    textColor: "{colors.green}"
    padding: "0"
  button-outline:
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0 1.5rem"
    height: "42px"
  button-ghost:
    textColor: "{colors.text-dim}"
    rounded: "{rounded.pill}"
    padding: "0 1.5rem"
    height: "42px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
  chip:
    textColor: "{colors.text-dim}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "36px"
  chip-active:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
  tag:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.green}"
    rounded: "{rounded.sm}"
    padding: "2px 0.5rem"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.base}"
    padding: "{spacing.card-pad}"
  card-hover:
    backgroundColor: "{colors.surface-2}"
  showcase-block:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
  post-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  input:
    backgroundColor: "{colors.field-bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
    height: "42px"
  nav-link:
    textColor: "{colors.text-dim}"
    rounded: "{rounded.pill}"
    padding: "0 0.75rem"
    height: "36px"
  carousel-arrow:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text}"
    size: "40px"
---

# Design System: MinerSkills

## Overview

**Creative North Star: "A Vitrine na Mina"**

A MinerSkills se apresenta como uma vitrine premium de produto: a lógica de layout e movimento da Apple e da Google Store, adaptada para uma equipe de robótica. O mundo é escuro, quase preto com um toque verde, e o verde da marca aparece com parcimônia, como sinal de ação, foco e dado de destaque. A página respira: seções amplas, blocos grandes e arredondados, títulos Geist semibold em caixa normal com tracking negativo, e muito espaço entre as coisas.

A densidade é baixa na parte pública e moderada no restante do kit (formulários, listas, filtros). A profundidade vem de degraus tonais de superfície e de luz verde radial, não de sombras pesadas nem de gradientes chapados. O movimento é parte da identidade: o conteúdo sobe e entra em foco (desfoque que se desfaz), imagens se revelam por máscara, números rolam, carrosséis encaixam, a navbar recolhe ao descer. Tudo isso para quando o usuário pede `prefers-reduced-motion`.

Este sistema substitui o v2 ("preto + menta", Chakra Petch em caixa alta, kicker mono, grade de cards de ícone). Esse vocabulário está recusado; a Chakra Petch sobrevive só no wordmark do logo.

**Key Characteristics:**
- Fundo quase preto esverdeado e rampa de superfícies perceptível (bg, surface, surface-2, surface-3).
- Verde #29D98C só para ação primária, link de vitrine, foco, seleção e o número de destaque.
- Geist semibold em caixa normal para toda a voz de título; Geist Mono apenas em números.
- Blocos grandes arredondados (20 a 36px) com contorno branco de 7%.
- Luz verde radial no topo (hero, cabeçalhos de página) e na base (chamada final, placeholders).
- Entrada "sobe e entra em foco", easing out-expo da casa, duração longa o bastante para ser lida.

## Colors

Uma paleta de um só acento: neutros escuros com leve temperatura verde e um verde menta saturado que carrega toda a intenção.

### Primary
- **Verde Mina** (green): botão primário, link de vitrine ("Nossa história ›", "Ver todas ›"), anel de foco, seleção de texto, aba ativa, ponto da rota ativa na navbar, ícones de metadado e o número grande do bento. No escuro o hover clareia para **Verde Mina Aceso** (green-hover), nunca escurece.
- **Verde Musgo** (green-deep): acento discreto sobre fundo escuro (ícone de fallback de capa, hover da barra de rolagem). Não é cor de texto.
- **Verde Véu** (green-soft): fundo de estado ativo/selecionado e de tag, sempre com texto verde por cima.
- **Tinta sobre Verde** (on-green): texto e ícone sobre qualquer preenchimento verde.

### Neutral

> **Textura do fundo:** o fundo não é chapado. Uma camada fixa atrás de todo o conteúdo (`body::before/::after` em `_base.scss`) soma a luz ambiente `--ms-ambient` (verde bem suave vindo do alto e das laterais) e a granulação `--ms-grain` (ruído SVG a 6% de opacidade). Superfícies opacas (cards, painéis) cobrem a textura; seções, rodapé e cabeçalhos de página a deixam aparecer.
- **Noite Mineral** (bg): fundo de página, rodapé, navbar transparente no topo.
- **Rocha** (surface): superfície de card e de bloco de vitrine.
- **Rocha Clara** (surface-2): degrau de hover de card, fundo de ícone de atalho, fundo de mídia enquanto carrega.
- **Rocha Polida** (surface-3): hover do ícone de atalho, setas do carrossel, botão desabilitado.
- **Poço** (field-bg): fundo de campo de formulário, um degrau abaixo do card.
- **Filete** (border-subtle): contorno padrão de bloco e divisórias internas (pilares, navbar sólida, rodapé).
- **Contorno** (border) e **Contorno Forte** (border-strong): contorno decorativo de card legado e separadores em destaque (filetes da contagem, barra de rolagem).
- **Contorno de Controle** (border-control): input, select, chip e botão outline; garante 3:1.
- **Texto** (text), **Texto Baixo** (text-dim), **Texto Discreto** (text-faint): título e corpo forte; corpo secundário, lead e subtítulos; legendas de 12 a 13px. Os três passam 4,5:1 em todas as superfícies (teste `tokens.contrast.test.ts`).

### Semantic
- **Perigo** (danger), **Alerta** (warning), **Informação** (info): cada um com par `-soft` (fundo 12%) e `-line` (contorno 35 a 40%) em `_tokens.scss`. Só em estados, nunca decorativos.

### Named Rules
**The Green Means Go Rule.** O verde marca o que se pode fazer ou o dado que importa: ação, foco, seleção, número de destaque. Nunca é fundo de seção, nunca é cor de corpo de texto, e há no máximo um botão primário verde por seção.

**The Light Not Paint Rule.** Destaque ambiental é luz verde radial (`--ms-glow` no topo, `--ms-glow-bottom` na base) sobre superfície escura. Blocos não recebem preenchimento verde chapado nem gradiente linear como fundo.

**The Tokens Only Rule.** Toda cor vive em `apps/web/src/styles/_tokens.scss`; um teste reprova hex ou `rgb()` literal fora dele.

## Typography

**Display Font:** Geist Variable (com Geist, system-ui, sans-serif)
**Body Font:** Geist Variable (mesma família; `ss01` e `cv11` ligados no body)
**Label/Mono Font:** Geist Mono Variable (com Geist Mono, ui-monospace, monospace), só para números

**Character:** Uma família só, em dois registros: título semibold bem justo, de vitrine, e interface regular/medium solta. A mono entra apenas quando o conteúdo é número, com algarismos tabulares que não pulam de largura. Todas as fontes são self-hosted via `@fontsource`.

### Hierarchy
- **Display** (600, clamp 2.5 a 4.5rem, 1.04, -0.035em): h1 de página (`PageHero`). A variante **display-xl** (clamp 3 a 6rem) serve ao cabeçalho de página grande. O nome "MINERSKILLS" do hero da Home é uma expressão da superfície: preenche a coluna de ponta a ponta (16.6cqi, leading 0.88, -0.05em).
- **Headline** (600, clamp 2 a 3.5rem, 1.06, -0.035em): h2 e títulos de seção (`SectionHeading`), no máximo 20ch (24ch centralizado).
- **Title** (600, 1.375rem, 1.3, -0.02em): h3, títulos de card e de coluna; **title-sm** (1.125rem) para h4.
- **Lead** (400, clamp 1.125 a 1.3125rem, 1.5): parágrafo de abertura e subtítulo de seção, em texto baixo, até 56ch (38ch no hero).
- **Body** (400, 1rem, 1.6): texto corrido; prosa longa em 68ch com leading 1.7.
- **Label** (500, 0.8125rem, +0.01em, caixa normal): metadado (data, autoria, nível de patrocínio), rótulos de grupo na navegação e no rodapé, legenda de dado.
- **Numeral** (Geist Mono 500, clamp 2.75 a 4.25rem, leading 1, -0.04em, tabular): estatísticas e contagem regressiva. O número principal do bento sobe até clamp(4.5rem, 12vw, 10rem) em verde.

### Named Rules
**The Sentence Case Rule.** Títulos em caixa normal, Geist semibold, tracking negativo. Caixa alta só no wordmark do logo, em siglas (FRC, FIRST, STEM) e no nome da equipe quando ele é o conteúdo.

**The Mono Is For Numbers Rule.** Geist Mono só aparece em número: estatística, dígito de contagem, contador de chip e badge. Um valor que é palavra ("Rising") volta para a voz de título.

**The Label Below Rule.** O rótulo pequeno nunca fica acima de um título de seção; o título fala por si. Rótulos vivem em grupos de navegação, colunas do rodapé, metadado e legenda de dado.

## Layout

Coluna única de conteúdo de 1200px (`--ms-container`) para shell e texto; blocos de vitrine e mídia podem abrir para 1440px (`--ms-container-wide`); formulários e leitura em 760px. Recuo lateral de 1.5rem, 1rem abaixo de 768px.

O ritmo vertical é por token: seção em `--ms-section-y` (clamp 3 a 4.75rem), gap de grade 1.25rem, gap de lista 0.75rem, padding de card `--ms-card-pad`. A escala `--ms-space-N` é de passos, não de múltiplos de 4px a partir do 5.

Composição de vitrine: título grande à esquerda com a ação alinhada à base à direita (`SectionHeading` em linha, `PageHero`), empilhando quando falta espaço. Carrosséis ocupam a largura toda da tela com recuo que alinha o primeiro item à coluna de conteúdo; itens de min(380px, 82vw) com snap no início. Faixas de atalhos e de chips viram linha rolável com desvanecimento nas bordas no celular.

Breakpoints: 480, 768, 1024 e 1280px (espelhados em `src/lib/breakpoints.ts`). A navbar completa aparece a partir de 1024px; abaixo, chamada curta e drawer. Nada rola na horizontal em 320px. Alvos de toque têm no mínimo 44px em ponteiro grosso.

## Elevation & Depth

Híbrido, com base plana. Em repouso as superfícies são planas e se separam por degraus tonais (bg, surface, surface-2, surface-3) e por um filete branco de 7%. A interação sobe um degrau de tom; sombra só aparece em card navegável em hover e em camadas flutuantes (menus, drawers, modais). A atmosfera vem da luz verde radial e dos scrims sobre foto; o vidro escuro (`--ms-scrim` com `saturate(180%) blur(20px)`) fica na navbar ao rolar e em legendas sobre imagem.

### Shadow Vocabulary
- **Sombra baixa** (`box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35)`): elementos pequenos que flutuam (skip link).
- **Sombra média** (`box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45)`): hover de card interativo, menus.
- **Sombra alta** (`box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6)`): modais e drawers.
- **Halo verde** (`box-shadow: 0 0 0 1px rgba(41, 217, 140, 0.25), 0 12px 40px rgba(41, 217, 140, 0.18)`): card selecionado, sempre junto com contorno verde.

### Named Rules
**The Tonal Step Rule.** Hover clareia a superfície um degrau (surface para surface-2) antes de qualquer sombra. Só o que navega levanta (`--ms-lift`, -2px, ou o ícone de atalho, -3px).

## Shapes

Cantos generosos que crescem com o tamanho do elemento: 8px em chips de status, tags e controles inline; 12px em inputs, selects e botões só de ícone; 20px em cards; 28px em blocos de vitrine (card de post, bloco de estatística, mídia do "Quem Somos", mídia do hero em repouso); 36px nos blocos de destaque (pilares, próxima competição, chamada final). Botões, chips, links da navbar e legendas sobre foto são pílulas. Setas de carrossel são círculos.

Contorno é filete fino (1px), quase sempre `border-subtle`; divisórias internas usam o mesmo filete (colunas dos pilares, unidades da contagem com `border-strong`). Mídia é sempre recortada pelo raio do bloco (`overflow: hidden`), e o anel de foco segue o raio do elemento.

### Named Rules
**The Radius Follows Size Rule.** Quanto maior o bloco, maior o raio: 8, 12, 20, 28, 36. Não misture um raio pequeno num bloco de vitrine nem um raio de 36px num controle.

## Components

### Buttons
Confiantes e macios: pílula, peso medium, seta que avança.
- **Shape:** pílula (999px); 42px de altura (36px `sm`, 52px `lg`); só ícone vira quadrado de 12px de raio.
- **Primary:** verde com tinta sobre verde, 0.9375rem medium, tracking -0.005em. Hover clareia para green-hover; pressionado encolhe para 0.97. Desabilitado vai para surface-3 com texto desabilitado.
- **Link (ação secundária de vitrine):** texto verde sem fundo e sem padding lateral, seguido de seta. Hover sublinha (offset 4px, 1px) e a seta avança 3px. É o par padrão do primário ("Faça parte" + "Nossa história ›").
- **Outline / Ghost:** outline com contorno de controle, hover contorno claro e véu branco de 10%; ghost em texto baixo, hover surface-2. Danger e danger-solid só em ações destrutivas.
- **Focus:** anel de 2px verde com offset 2px; sobre verde, o contexto troca `--ms-focus-color`.

### Chips
- **Style:** pílula de 36px, contorno de controle, texto baixo, 0.875rem medium; contador interno em mono.
- **State:** ativo inverte para fundo claro (text) com texto escuro (bg) em semibold; o verde não é usado para filtro ativo. No celular a fileira vira linha rolável.

### Tags
- Retângulo de 8px, 0.75rem semibold: verde sobre véu verde por padrão, com variantes neutra, sucesso, alerta, perigo, informação e sólida.

### Cards / Containers
- **Corner Style:** 20px (card), 28px (card de post e bloco de estatística), 36px (bloco de destaque).
- **Background:** surface; hover em surface-2.
- **Shadow Strategy:** plano; ver Elevation & Depth.
- **Border:** filete branco de 7%.
- **Internal Padding:** `--ms-card-pad` (clamp 1.5 a 2.25rem); blocos de destaque até 3 a 3.5rem.
- **Card de post:** capa 4:3 no topo sem contorno próprio, foto aproxima para 1.05 em 900ms no hover, título em 2 linhas, "Leia mais" verde com seta.

### Inputs / Fields
- **Style:** fundo field-bg (um degrau abaixo do card), contorno de controle 1px, raio 12px, 42px de altura, texto 1rem.
- **Focus:** anel verde de 2px, offset 2px.
- **Error / Disabled:** mensagem em perigo com ícone de 14px e resumo de erros em véu vermelho; desabilitado com contorno e texto desabilitados.

### Navigation
- **Navbar:** fixa, 60px (56px no celular). Transparente no topo; ao rolar vira vidro escuro com filete inferior; ao descer recolhe para cima e volta ao subir ou quando recebe foco.
- **Links:** pílulas de 36px em texto baixo, 0.875rem medium; hover clareia o texto; rota ativa em texto claro com um ponto verde de 4px sob o rótulo.
- **Mobile:** abaixo de 1024px, logo, botão curto e botão de menu redondo de 44px que abre drawer com grupos rotulados.

### Carrossel
Trilho de largura total com snap no início; setas circulares de 40px em surface-3, alinhadas à direita abaixo do trilho, encolhendo para 0.94 ao pressionar e esmaecendo a 35% nas pontas.

### Contagem regressiva
Placar em Geist Mono tabular, dígitos grandes (clamp 2.5 a 4.5rem) separados por filetes verticais, sem caixas; cada dígito rola para cima ao mudar. Rótulo de unidade como metadado discreto abaixo.

### Bloco de imagem do hero (assinatura)
Mídia de largura de vitrine (1440px) que nasce recolhida (escala 0.86, raio 56px) e cresce até 1 e 28px enquanto a página rola, com a foto em paralaxe (-10% a 10%) por dentro; legenda em pílula de vidro escuro no canto inferior. Sem foto, vira faixa baixa com o selo sobre luz verde.

### Movimento
- **Entrada:** sobe (24 a 28px) e sai de um desfoque de 8px em 0.8s, easing `cubic-bezier(0.22, 1, 0.36, 1)`, uma vez por elemento; listas escalonam os filhos.
- **Revelação de imagem:** máscara `clip-path` que abre de `inset(14% 10%)` para cheio em 1.1s.
- **Títulos:** `TextReveal` — cada palavra sobe de dentro de uma máscara (60ms entre palavras, 0.8s); no nome da Home, letra a letra (35ms), com cópia só para leitores de tela. Cabeçalhos de página animam ao montar; títulos de seção, ao entrar na tela.
- **Paralaxe:** `Parallax` — a foto (escala 1.18) desliza de -8% a 8% enquanto a moldura atravessa a tela (bloco de números, "Quem Somos").
- **Rolagem que desenha:** o trilho da linha do tempo (História) se preenche em verde com o progresso da leitura; cada marco entra deslizando e o ponto acende com mola (bounce 0.3). A luz da chamada final cresce de 0.55 a 1 até o bloco chegar ao centro.
- **Equipe:** a grade reorganiza os cards com animação de layout ao filtrar (0.4s); o anel de seleção (`layoutId`) desliza de um card ao outro com mola (0.45s, bounce 0.15); a ficha abre a foto por máscara de cima para baixo, os cantos da moldura fecham e o texto entra em sequência.
- **Galeria:** linhas justificadas (cada foto cresce na proporção largura/altura) com entrada escalonada por coluna (60ms).
- **Estados:** 150ms (cor), 250ms (fundo, contorno), 500ms (navbar, zoom de imagem).
- **Reduced motion:** entradas viram só opacidade; transformações ligadas à rolagem desligam; só spinner e esqueleto continuam.

## Do's and Don'ts

### Do:
- **Do** usar o verde #29D98C para uma ação primária por seção, o link de vitrine, foco, seleção e o número de destaque, e nada além disso.
- **Do** escrever títulos em Geist semibold, caixa normal, com `display-heading` (-0.035em) em h1/h2 e `ui-heading` (-0.02em) em h3 e abaixo.
- **Do** colocar números em Geist Mono tabular via `numeral`; palavras em lugar de número voltam para a voz de título.
- **Do** separar blocos por degrau tonal e filete branco de 7%; no hover, subir um degrau de superfície.
- **Do** seguir a escala de raio 8 / 12 / 20 / 28 / 36 conforme o tamanho do bloco, com botões em pílula.
- **Do** parear o botão primário com o link verde com seta como ação secundária.
- **Do** fazer o conteúdo entrar subindo e saindo do desfoque com o easing da casa, e respeitar `prefers-reduced-motion`.
- **Do** buscar toda cor em `_tokens.scss`, mantendo texto em 4,5:1 e contorno de controle em 3:1.

### Don't:
- **Don't** usar Chakra Petch, caixa alta ou fonte mono em títulos; a Chakra Petch fica só no wordmark do logo.
- **Don't** colocar um rótulo pequeno (kicker, eyebrow) acima de um título de seção.
- **Don't** pintar blocos de verde chapado ou de gradiente linear; o destaque é luz radial.
- **Don't** apresentar conteúdo como grade de cards de ícone + texto (a faixa de atalhos da Home é navegação, não conteúdo), nem usar neon ou brilho verde decorativo; o halo verde é só estado de seleção.
- **Don't** levantar ou sombrear o que não navega; sombra é resposta a hover de card navegável ou camada flutuante.
- **Don't** usar cor literal fora de `_tokens.scss`.
