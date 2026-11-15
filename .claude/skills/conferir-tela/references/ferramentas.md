# Ferramentas do Playwright MCP para cada conferência

O MCP sobe com `--caps network,storage` (ver `scripts/mcp-playwright.cjs`).
As de leitura estão liberadas em `.claude/settings.json`; as que agem pedem
permissão.

| Quero conferir | Ferramenta |
|---|---|
| Abrir a tela | `browser_navigate`, `browser_navigate_back`; dentro do app, `browser_click` no item da sidebar |
| O texto, o que não pode aparecer, nomes acessíveis | `browser_snapshot`, `browser_find` |
| Clicar, digitar, preencher | `browser_click`, `browser_type`, `browser_fill_form`, `browser_select_option` |
| Teclado e foco | `browser_press_key` + `browser_snapshot` |
| Payload e resposta (Supabase REST/Auth) | `browser_network_requests`, `browser_network_request` |
| Erro no console | `browser_console_messages` |
| Supabase fora | `browser_route` (abort em `127.0.0.1:54321/**`) e `browser_unroute`; `browser_route_list` |
| Sem rede (PWA) | `browser_network_state_set` |
| Celular | `browser_resize` (375 × 812) |
| Tema, preferências | `browser_localstorage_get` (`koinonia_theme`, `koinonia_contacts_view`), `browser_localstorage_list` |
| Diálogo do navegador | `browser_handle_dialog` |
| Esperar | `browser_wait_for` |
| Ver com os olhos | `browser_take_screenshot` |

Limites: o snapshot não é um leitor de tela de verdade, e o print não diz se
uma cor tem contraste suficiente nem como a animação se sente. Esses itens são
"PRECISA DE VOCÊ".
