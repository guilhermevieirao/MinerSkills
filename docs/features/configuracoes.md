# Configurações

**Onde aparece:** rodapé (todas as páginas) e, em fase futura, Como Entrar ·
**Admin:** `/admin/configuracoes` ·
**Componente:** `apps/web/src/admin/sections/SettingsSection.tsx`

Textos e opções gerais do site que não pertencem a nenhuma página específica: lema,
linha de localização, e-mail de contato e o estado das inscrições. Ficam no model
genérico `Setting` (chave/valor, ambos `String`), mas **só as chaves listadas em
`SETTING_DEFINITIONS`** são aceitas pela API e exibidas pelo painel.

## Chaves

Definidas em [`constants.ts`](../../packages/shared/src/constants.ts)
(`SETTING_DEFINITIONS`), a única fonte de verdade para rótulo, dica e tipo de campo:

| Chave | Rótulo no painel | Tipo | Onde aparece |
| --- | --- | --- | --- |
| `team_motto` | Lema da equipe | `text` | Rodapé, abaixo do nome da equipe. |
| `city_line` | Cidade / região | `text` | Rodapé: "FIRST Robotics Competition · {city_line}". |
| `contact_email` | E-mail de contato | `email` | Rodapé, como link `mailto:` (só quando preenchido). |
| `applications_open` | Inscrições abertas | `boolean` | Reservado para Como Entrar exibir o formulário de inscrição (fase futura). |
| `applications_info` | Aviso sobre inscrições | `textarea` | Reservado para Como Entrar, enquanto as inscrições estão fechadas (fase futura). |

Valores booleanos são gravados como `'true'` / `'false'`; todo valor tem no máximo
2000 caracteres (`settingSchema`).

## Painel

Um **formulário único**, gerado a partir de `SETTING_DEFINITIONS`: `text`/`email` viram
`<Input>`, `textarea` vira `<Textarea>` e `boolean` vira um checkbox (`.ms-checkbox`).
Cada campo usa o rótulo e a dica da definição (`<Field label hint>`), portanto
`getByLabel('Lema da equipe')` funciona nos testes.

- Carrega de `GET /api/admin/settings`; chave ausente no banco começa vazia (`''`) ou
  desligada (`'false'`).
- **Salvar** valida cada item com `settingSchema` (erro por campo) e envia **todas** as
  chaves em `PUT /api/admin/settings/bulk` → toast "Configurações salvas.".
- Só o que o usuário digitou fica em estado local; o restante vem da query. Um
  indicador "Alterações não salvas" aparece enquanto há edição pendente.
- Após salvar, invalida `['admin-settings']` e `['settings']` — o rodapé do site
  reflete a mudança na próxima renderização.

## Site público

`useSettings()` ([`useSocial.ts`](../../apps/web/src/features/social/useSocial.ts))
devolve o mapa chave → valor de `GET /api/settings`; `useSetting(key)` devolve um
valor único já sem espaços nas pontas (`undefined` quando ausente/vazio), para que o
componente escolha o fallback.

O rodapé ([`Footer.tsx`](../../apps/web/src/components/layout/Footer.tsx)) usa
fallbacks enquanto a API não respondeu ou a chave está vazia: o lema fixo original e
`TEAM.city + ' — ' + TEAM.state` (`constants.ts`). O texto "Apoio: FIEMG · SESI · SENAI"
continua fixo — será substituído pelos patrocinadores em outra fase.

## Como adicionar uma chave nova

1. Acrescente a definição em `SETTING_DEFINITIONS` (`key`, `label`, `hint`, `type`).
   `SettingKey`, `SETTING_KEYS`, o `z.enum` do `settingSchema` e o formulário do painel
   passam a conhecê-la automaticamente.
2. Dê um valor inicial em `seedSocial` (`apps/api/prisma/seed.ts`) — o `Record<SettingKey, string>`
   faz o TypeScript apontar a chave que ficou sem valor.
3. Consuma no site com `useSetting('nova_chave')`, sempre com fallback.

Não há migration: o model `Setting` é genérico. Em um banco já povoado, a chave nova
aparece vazia no painel e é criada no primeiro **Salvar** (o `/bulk` faz `upsert`).

## Seed

Todas as chaves nascem preenchidas (nos dois modos, `full` e `test`):
lema "Escavamos conhecimento, construímos o futuro.", cidade
"Belo Horizonte / Contagem — MG", e-mail `contato@minerskills.com.br`,
inscrições abertas e um aviso padrão. **Confirme o e-mail real** antes de publicar.

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/settings` | Público: mapa chave → valor. |
| `GET` | `/api/admin/settings` | Lista `SettingDTO[]` (`{ key, value }`), ordenada por chave. |
| `PUT` | `/api/admin/settings` | Upsert de **uma** chave (`settingSchema`). |
| `PUT` | `/api/admin/settings/bulk` | Upsert de 1 a 50 chaves numa transação (`settingsBulkSchema`); responde a lista completa atualizada. Chave fora de `SETTING_KEYS` → `400`. |

## Testes

- Unitário: `packages/shared/src/schemas/settings.test.ts` (chaves aceitas/rejeitadas,
  limites do lote).
- E2E: `e2e/tests/admin-settings.spec.ts` — em série; altera o lema, confere o rodapé e
  restaura o valor original pela API. Como a configuração é global, só o projeto
  desktop faz a alteração (o mobile só verifica o formulário), evitando corrida entre
  projetos.
