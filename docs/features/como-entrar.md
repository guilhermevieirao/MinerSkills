# Como Entrar

**Rota:** `/como-entrar` · **Componente:** `apps/web/src/pages/ComoEntrarPage.tsx` ·
**Admin:** `/admin/paginas` → blocos da página `como-entrar` · `/admin/configuracoes`
(inscrições abertas/aviso) · `/admin/mensagens` (inscrições recebidas)

Explica o processo seletivo. É o destino do CTA principal da landing e do botão fixo
da navbar.

## Seções

| Parte | Origem |
| --- | --- |
| Cabeçalho | bloco `hero` |
| Marquee | "INSCRIÇÕES · PROCESSO SELETIVO · #10019" |
| Etapas | blocos `step_*` (cards numerados com ícone) |
| Requisitos | bloco `requisitos` |
| Inscreva-se (`#inscricao`) | configuração `applications_open` + formulário de inscrição (ver abaixo) |
| CTA final | bloco `cta` + botões das redes sociais |

## Blocos (`page = como-entrar`)

| `key` | Campos |
| --- | --- |
| `hero` | `title`, `subtitle`, `body` |
| `step_1` … `step_4` | `title` = nome da etapa · `subtitle` = "Etapa N" · `body` = descrição |
| `requisitos` | `title`, `subtitle`, `body` |
| `cta` | `title`, `body` |

> As etapas são renderizadas **por prefixo** (`step_`) e ordenadas por `order` —
> criar `step_5` no painel adiciona uma etapa nova automaticamente, com ícone
> escolhido ciclicamente. Não é preciso mexer no código.

## Datas do processo seletivo

Não são fixas na página: o botão "Ver datas na agenda" leva para `/agenda`, onde o
administrador cadastra eventos do tipo **processo-seletivo**. Assim não há duas
fontes de verdade para a mesma informação.

## Inscrição

Logo após os requisitos, o bloco `#inscricao` depende da configuração
**Inscrições abertas** (`applications_open`, em `/admin/configuracoes`):

| Estado | O que aparece |
| --- | --- |
| Carregando | nada (evita piscar o formulário) |
| Abertas | `<ContactForm kind="inscricao" title="Inscreva-se" />` — Nome, E-mail, Telefone (opcional), Escola, Série/ano e Mensagem |
| Fechadas | card "Inscreva-se" com o texto de **Aviso sobre inscrições** (`applications_info`; fallback "As inscrições estão encerradas no momento.") e o botão "Ver datas na agenda" |

O envio vai para `POST /api/contact` e cai na caixa de entrada do painel
(`/admin/mensagens`) como **inscrição**; a confirmação na tela é "Inscrição enviada!
Entraremos em contato.". A API recusa (`409`) inscrições com o processo fechado, então
fechar em Configurações basta para encerrar. Detalhes do formulário, honeypot e rate
limit em [contato.md](contato.md).

## Redes sociais

O CTA final lista os links de `GET /api/social-links` — os mesmos do rodapé,
gerenciados em `/admin/social`.

## API

`GET /api/pages/como-entrar` · `GET /api/social-links` · `GET /api/settings`
(`applications_open`, `applications_info`) · `POST /api/contact`
