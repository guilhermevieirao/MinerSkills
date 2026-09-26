---
version: 1
slug: "apps-web-src-pages-homepage-tsx"
primary_target: "apps/web/src/pages/HomePage.tsx"
related_targets: []
---

# Home (/) — surface brief

Mode: Persuade. Audience: alunos SESI/SENAI, pais, patrocinadores e comunidade FRC, com o mesmo peso. Job: entender quem é a equipe em uma rolagem e achar o próprio próximo passo (inscrever-se, apoiar, acompanhar).

## Direction contract

THESIS: A MinerSkills se apresenta como uma vitrine premium de produto (lógica de layout e movimento da Apple e da Google Store), escura e verde, em vez do "site de equipe tech" com neon, kicker mono e grade de cards de ícone que ela recusa.
OWN-WORLD: Fundo quase preto com toque verde (#050706), superfícies #0F1412/#161D1A, verde #29D98C só para ação, foco e dado de destaque. Geist semibold em caixa normal com tracking negativo; Geist Mono só em números. Blocos grandes arredondados (20–36px), contorno de 7% branco, luz verde radial em vez de gradiente chapado.
STORY: O visitante vê o nome gigante e a frase da equipe, uma foto grande que cresce ao rolar, atalhos para tudo, quem somos, números em bento, a próxima competição com contagem, FRC/FIRST/STEM, notícias em carrossel, patrocinadores e o convite final.
FIRST VIEWPORT: "MINERSKILLS" de ponta a ponta no alto (até 10.5rem); abaixo, lead à esquerda e "Faça parte" (primário verde) + "Nossa história ›" à direita; a borda superior do bloco de imagem de largura 1440 aparece já na primeira dobra.
FORM: Canon pinado pelo usuário (vitrine Apple/Google Store adaptada), escolhido no lugar da lista rolada; seed ea25faab. Assinatura de movimento: bloco de imagem do hero com escala 0.86→1, raio 56→28 e paralaxe da foto ligados à rolagem; gramática de apoio: entrada sobe+desfoque, máscara que abre em Quem Somos, dígitos que rolam na contagem, carrosséis com snap, navbar que recolhe ao descer.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
