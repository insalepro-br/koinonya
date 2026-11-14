# Esquema do Supabase

Primeira versão do banco Postgres que substitui o Firestore. Feita a partir da captura de 14/11/2026 (`firestore/schema.md`), do `types.ts` e das regras publicadas. Validada com importação dos dados reais e testes de RLS no Supabase local.

| Arquivo | Conteúdo |
| --- | --- |
| [20261114160000_core_schema.sql](../../supabase/migrations/20261114160000_core_schema.sql) | 22 tabelas, FKs, CHECKs, índices |
| [20261114160100_rls.sql](../../supabase/migrations/20261114160100_rls.sql) | RLS, permissões por módulo, travas por trigger, Realtime |
| [20261114160200_public_api.sql](../../supabase/migrations/20261114160200_public_api.sql) | Onboarding, fluxos públicos, vínculo de login |
| [rls.test.sql](../../supabase/tests/database/rls.test.sql) | 25 testes pgTAP (`pnpm db:test`) |
| [lib/database.types.ts](../../lib/database.types.ts) | Tipos gerados (`pnpm db:types`) |

## Decisões

- **IDs em `text`.** Preservam os IDs do Firestore; registros novos recebem UUID em texto. O app não precisa mudar a forma de referenciar.
- **Isolamento por organização.** Toda tabela tem `org_id` e `church_id`, com FK composta `(church_id, org_id)` para a igreja ser sempre da mesma organização. `org_id` não muda depois de criado.
- **Valores em `numeric(12,2)`**, datas em `timestamptz`, domínios em `text` + `CHECK`.
- **Estruturas embutidas mantidas nesta fase:** `pipeline_stages`, `access_levels`, `steps`, `assignments` em `jsonb`; listas de IDs em `text[]`. Normalizar depois, quando o código já estiver no Supabase.
- **`users` não tem senha.** Login é do Supabase Auth; o perfil liga a `auth.users` por `auth_user_id`. Perfis importados são vinculados no primeiro login, pelo e-mail, **só com e-mail confirmado**.
- **`''` vira `null`** em colunas `*_id` (o app usava string vazia para "sem vínculo").

## Segurança: o que muda em relação ao Firestore

| Antes (firestore.rules) | Agora |
| --- | --- |
| Qualquer usuário logado criava o próprio perfil com qualquer `role` e `org_id`, inclusive `SUPER_ADMIN` | Perfil nasce só pelo `onboard_organization()` (vira ADMIN da própria org nova) ou por admin com `equipe_edit` |
| Admin da organização podia promover alguém a `SUPER_ADMIN` | Só `SUPER_ADMIN` concede `SUPER_ADMIN` |
| Qualquer membro da organização lia tudo (financeiro, pedidos confidenciais) | Leitura e escrita seguem as permissões do nível de acesso (`financeiro_view`, `pastoral_view`…); `PASTOR_CONFIDENTIAL` só ADMIN/PASTOR |
| Visitante anônimo gravava direto em `members`, `prayer_requests`, `event_registrations` | Anônimo só chama `submit_visitor_checkin`, `submit_prayer_request`, `register_for_event`: validam entrada e definem status, valor e código no servidor; inscrição respeita a capacidade com lock |

Permissão efetiva: `SUPER_ADMIN` e `ADMIN` têm tudo; `'all'` em `users.permissions` também; caso contrário vale a lista do perfil, ou a lista padrão do papel quando o perfil não tem lista própria.

## Achados da captura

- Dois perfis em `users` tinham **senha em texto puro** (campo `password`). A captura mascarou; o esquema novo não tem a coluna. Apagar o campo no Firestore e trocar a senha se for reutilizada.
- O login por e-mail/senha nem está ativo no Firebase: o único usuário do Auth entra com Google.
- O bucket do Storage nunca foi criado. Logos estão como data-URI dentro de `churches.logo_url` (até ~12 KB); mover para o Storage do Supabase depois.
- Existe um segundo banco no projeto (`ai-studio-488aac35…`, abril/2026) de outro app (calendário). Fora do escopo.

## Rodar localmente

```powershell
pnpm db:start             # sobe o Supabase no Docker
pnpm db:reset             # aplica as migrations do zero
pnpm db:import:firebase   # importa a captura mais recente de exports/firebase/
pnpm db:test              # testes de RLS
```

Studio: http://127.0.0.1:54323

## Próximo passo

Trocar `services/db.ts` (Firestore + `onSnapshot`) por `supabase-js` + Realtime, e `LoginScreen` pelo Supabase Auth com Google. O servidor já aceita `AUTH_PROVIDER=supabase`.
