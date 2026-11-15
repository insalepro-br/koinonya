# Testes manuais

Roteiro para conferir telas à mão ou com o agente `testador-de-tela`
(skill `conferir-tela`). Cada item diz onde ir, o que fazer e o que esperar.
Marque `[x]` quando passar.

## Bloco A: tema escuro em Contatos, Agenda e Igreja

Preparação: dev (`pnpm db:start` + `pnpm dev`), logado com a conta sintética,
pelo menos 1 contato ativo e 1 agendamento no mês. Tema escuro ligado pelo
menu do perfil → "Tema Escuro" (mostra Ativo/Inativo).

- [ ] A1. Contatos: fundo da tela escuro (sem cinza claro); título "Gestão de
  Contatos", subtítulo e contador "N pessoas" legíveis.
- [ ] A2. Contatos: no seletor Lista/Cartões, o rótulo inativo continua
  visível; o ativo fica indigo.
- [ ] A3. Contatos: abas "Contatos Ativos" (ativa, fundo claro invertido) e
  "Lixeira / Arquivados" legíveis; contadores visíveis.
- [ ] A4. Contatos: botões Importar CSV, Exportar CSV e QR Code Ficha com fundo
  escuro e texto legível; busca e selects com fundo escuro e texto branco.
- [ ] A5. Contatos, Lista: cabeçalho, linhas e hover escuros; botão "Editar"
  fica indigo sólido no hover.
- [ ] A6. Contatos, Cartões: cartões escuros, faixa colorida da etapa no topo
  mantida.
- [ ] A7. Contatos: estado vazio (busca sem resultado) legível.
- [ ] A8. Contatos: modais Novo Contato, Importar CSV, QR Code, Arquivar (fechar
  sem confirmar) sem superfície branca sobrando. O QR continua em fundo branco.
- [ ] A9. Agenda: calendário e lista escuros; dia de hoje indigo com número e
  bolinha brancos; modal de novo agendamento escuro (fechar sem salvar).
- [ ] A10. Igreja: card do logo, formulário e inputs escuros; texto dos inputs
  branco.
- [ ] A11. Repetir A1, A5, A9 e A10 no tema claro: visual igual ao de antes.

## Bloco B: sidebar

Preparação: dev, logado, 1280 px de largura. Fazer no claro e no escuro.

- [ ] B1. Sidebar aberta: logo, nome "Koinonya", itens com rótulo e "Sair"
  alinhados como antes.
- [ ] B2. Fechar (botão de menu no header): logo e ícones centralizados na
  faixa de 96 px; pílula do item ativo simétrica em volta do ícone; "Sair"
  centralizado.
- [ ] B3. Sidebar fechada: passar o mouse num ícone mostra o nome (title); o
  snapshot mostra o nome acessível de cada item.
- [ ] B4. Abrir e fechar algumas vezes: o conteúdo não pula nem quebra linha
  durante a animação.

## Bloco C: animações

- [ ] C1. Abrir o menu do perfil e um modal (ex.: Arquivar contato): entram
  com fade e zoom curto, sem aparecer de uma vez. (PRECISA DE VOCÊ para julgar
  a sensação.)

## Bloco D: páginas públicas sempre no claro

Preparação: tema escuro salvo no app.

- [ ] D1. Abrir `/checkin?churchId=<id>&orgId=<id>`: página no tema claro,
  texto legível.
- [ ] D2. Abrir `/portal?churchId=<id>&orgId=<id>` (ou "pré-visualizar portal"
  em Eventos & Portal): tema claro; ao sair, o app volta ao escuro.

## Bloco E: confirmação de e-mail em dev

- [ ] E1. Criar conta pelo app com e-mail sintético: aparece o aviso de link
  enviado.
- [ ] E2. Mailpit (http://127.0.0.1:54324): e-mail "Confirm your email
  address" chegou; o link termina em `redirect_to=http://localhost:3009`.
- [ ] E3. Clicar no link no mesmo navegador: volta para o app em
  `localhost:3009`; o login com e-mail e senha conclui o cadastro.
