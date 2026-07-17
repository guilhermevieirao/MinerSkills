# Quiz

**Rota:** `/quiz` · **Componente:** `apps/web/src/pages/QuizPage.tsx` · **Admin:** `/admin/quiz`

Jogo sobre a MinerSkills, a FRC e a FIRST, com leaderboard público.

## Fluxo

```
intro  → informa o apelido (3–20 caracteres, validado)
playing→ uma pergunta por vez, barra de progresso, opções A/B/C/D
         (ao escolher, avança após 220ms)
result → pontuação, posição no ranking, tempo, gabarito comentado
```

O leaderboard fica sempre visível ao lado (empilhado no mobile) e é invalidado
assim que uma partida termina.

## Integridade — o ponto central

| Regra | Como |
| --- | --- |
| O gabarito **nunca** vai ao cliente | `GET /api/quiz/questions` devolve as opções só com `id` e `text`. Há teste que inspeciona o payload e falha se `isCorrect` aparecer. |
| A pontuação é **calculada no servidor** | `POST /api/quiz/submit` compara as respostas com o banco. O cliente não consegue forjar resultado. |
| Opções embaralhadas | A cada requisição (Fisher-Yates). |
| Rate limit | `RATE_LIMIT_QUIZ_MAX` (30/15min). |
| Apelido | Validado por regex e com HTML removido. |

## Leaderboard

Guarda a **melhor pontuação por apelido** — uma partida só substitui a anterior se
tiver mais acertos, ou os mesmos acertos em menos tempo. Ordenação:
pontuação ↓ · duração ↑ · data ↑. O `rank` devolvido é a posição global.

> Não há autenticação: apelidos podem se repetir entre pessoas. É um jogo, não um
> sistema de identidade.

## Painel

- CRUD de perguntas com 2 a 6 opções; **exatamente uma** correta (validado por
  `.refine()` no zod, nos dois lados).
- Botão de "correta" ao lado de cada opção.
- Campo de explicação exibido no gabarito ao final.
- `active` tira a pergunta do jogo sem apagá-la.
- **Zerar leaderboard** (com confirmação) — apaga todas as pontuações.

## Perguntas do seed

12 perguntas com fatos verificáveis: significado de FIRST/FRC/STEM, fundação (Dean
Kamen, 1989), número da equipe (#10019), estado (MG), patrocinador (FIEMG), escolas
(SESI e SENAI), prêmio (Rising All-Star), Coopertition, duração da temporada (~6 semanas).

## API

| Método | Rota |
| --- | --- |
| `GET` | `/api/quiz/questions` |
| `POST` | `/api/quiz/submit` |
| `GET` | `/api/quiz/leaderboard?limit` |
| `GET`/`POST`/`PUT`/`DELETE` | `/api/admin/quiz/questions[/:id]` |
| `DELETE` | `/api/admin/quiz/leaderboard` |
