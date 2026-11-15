---
name: conferir-tela
description: Use quando o usuário pedir para a IA rodar itens de um roteiro manual do Koinonya (ou conferir uma tela, tema claro/escuro, sidebar, celular) no navegador com o Playwright MCP, em dev ou em staging, devolvendo OK, PROBLEMA ou PRECISA DE VOCÊ por item. Só leitura por padrão.
---

# Conferir tela do Koinonya com o Playwright

## Antes

1. Leia os itens pedidos em `docs/testes-manuais.md` e a Preparação do bloco.
   Se o pedido trouxer itens soltos, use-os como roteiro.
2. Confirme o ambiente (`references/ambientes.md`). **Staging tem dados reais
   de igrejas (importados do Firebase): só leitura, e print só se o pedido
   exigir.** Produção, nunca sem confirmação explícita.
3. Em dev, o dev server e o Supabase local são do usuário. Se
   `http://localhost:3009` não responder, peça para ele rodar `pnpm db:start`
   e `pnpm dev`, e espere. Nunca suba você.
4. Um navegador por vez: o MCP usa `.playwright/profile`. Se disser que o
   perfil está em uso, peça para fechar a outra janela.

## Entrar

O perfil guarda a sessão; se cair no login, preencha com o **nome** da chave
como valor: `KOI_DEV_EMAIL`, `KOI_DEV_SENHA` (staging: `KOI_STAGING_*`). O MCP
digita o valor do `.playwright/secrets.env`, e a resposta mostra
`<secret>NOME</secret>`. Nunca leia o `secrets.env` e nunca digite dado real.

Se o login responder "Confirme seu e-mail", em dev o link está no Mailpit
(`http://127.0.0.1:54324`): abrir e clicar no link mais recente é permitido.
Em staging, devolva PRECISA DE VOCÊ.

## Navegar no app

- O app é uma página só: as telas não têm endereço. Troque de tela clicando no
  item da sidebar pelo nome (Contatos, Agenda, Igreja...). Com a sidebar
  fechada, o nome está no `aria-label`/`title` do botão.
- Abrir/fechar a sidebar: botão de menu (ícone Menu/X) no início do header.
- Tema: menu do perfil (avatar no canto do header) → "Tema Escuro" (mostra Ativo/Inativo). Fica só no
  navegador (`localStorage.koinonia_theme`), então trocar o tema é permitido.
  Confira com `browser_localstorage_get` e, no snapshot, a classe vem do `<html>`.
- Páginas públicas: `/checkin?churchId=...&orgId=...` e
  `/portal?churchId=...&orgId=...`. Ficam sempre no tema claro, mesmo com o
  escuro salvo.

## Item por item

- Ler: `browser_snapshot` (árvore de acessibilidade: confira o texto exato e o
  que **não** pode aparecer).
- Rede e console: `browser_network_requests`, `browser_console_messages`.
- Celular: `browser_resize` 375 × 812, e confira que não há rolagem lateral.
- Teclado: `browser_press_key` (Tab, Enter, Escape) e o foco no snapshot.
- Print quando o julgamento é visual (tema, alinhamento, sidebar):
  `browser_take_screenshot` com nome `item-N-<tema>.png`; vai para
  `.playwright/saida/`, que não sai da máquina.
- Tema escuro: o padrão está na skill global `koinonya-style`
  (`references/anatomy.md`, "Mapa claro → escuro"). No print, PROBLEMA é
  superfície branca sobrando, texto escuro sobre fundo escuro, rótulo que
  some ou borda clara forte. Contraste fino é PRECISA DE VOCÊ.

Mapa completo em `references/ferramentas.md`.

## Só leitura por padrão

Navegar, trocar de tela, abrir menu, abrir modal e fechar sem salvar, trocar o
tema e a sidebar: sim. Clicar no que grava (salvar, excluir, arquivar,
importar, enviar, convidar, mudar etapa) **só quando o usuário pediu aquele
item** nesta rodada e só em dev. Em staging, nunca.

## Relatório

Um por item, no formato de `examples/relatorio-exemplo.md`:

- `Item N — OK`
- `Item N — PROBLEMA: esperado "X"; apareceu "Y"` (+ print, se houver)
- `Item N — PRECISA DE VOCÊ: <o que a IA não julga>` (contraste fino, leitor
  de tela de verdade, sensação de animação ou de layout)

No fim: quantos OK, quais problemas, o que ficou para o usuário.
