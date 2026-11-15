# Ambientes para conferir tela

| Ambiente | App | Auth / e-mail |
|---|---|---|
| dev | http://localhost:3009 (`pnpm dev`) | Supabase local (`pnpm db:start`); e-mails no Mailpit http://127.0.0.1:54324 |
| staging | https://koinonya-staging.up.railway.app | Supabase Cloud `koinonya-staging` |
| produção | ainda não existe (domínio previsto: koinonya.app) | — |

- Dev usa uma conta sintética (`KOI_DEV_*`); os dados são locais e podem ser
  apagados. Ação que grava, só com pedido.
- Staging usa a conta do usuário (`KOI_STAGING_*`) e tem dados reais de igrejas
  (membros, contatos, finanças), protegidos pela LGPD. Só leitura; evite print
  com dados pessoais e nunca copie esses dados para o relatório.
- Staging ainda usa o SMTP padrão do Supabase: e-mail de confirmação não chega
  para quem não é da org do Supabase. Item que dependa disso é PRECISA DE VOCÊ.
- Quando produção existir, ela entra aqui e só com confirmação explícita.
