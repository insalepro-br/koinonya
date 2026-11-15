# Captura do Firebase legado

Como extrair dados, esquema, regras, índices, Auth e Storage do projeto do AI Studio para replicar no Supabase. Tudo é **somente leitura**: o script não grava nada no Firebase.

| Item | Valor |
| --- | --- |
| Projeto | `gen-lang-client-0519033383` |
| Banco Firestore (nomeado) | `ai-studio-56e15dbb-ab27-47d4-a16d-0dd5e607f1f4` |
| Bucket | `gen-lang-client-0519033383.firebasestorage.app` |
| Script | [scripts/firebase-capture/capture.ts](../../scripts/firebase-capture/capture.ts) |
| Plano Firebase | Spark (sem faturamento: exportação gerenciada indisponível) |

## 1. Confirmar acesso ao projeto

Abra com a conta Google que criou o app no AI Studio:

- https://console.firebase.google.com/project/gen-lang-client-0519033383/overview
- https://console.cloud.google.com/iam-admin/iam?project=gen-lang-client-0519033383

A conta precisa ser **Owner** ou ter, no mínimo: `Cloud Datastore Viewer`, `Firebase Rules Viewer`, `Firebase Authentication Viewer`, `Storage Object Viewer`. Se o projeto não aparecer, ele está em outra conta Google.

## 2. Rodar pelo Google Cloud Shell (recomendado, sem login no terminal)

O Cloud Shell é um terminal no navegador que já usa a conta logada no console. Não precisa instalar nada nem fazer login de novo.

1. Na sua máquina, gere o kit: `pnpm --dir scripts/firebase-capture pack:cloudshell` → `exports/koinonya-captura.zip`.
2. Abra https://console.cloud.google.com/?project=gen-lang-client-0519033383&cloudshell=true (ou o ícone `>_` no canto superior direito do console).
3. No Cloud Shell: menu **⋮ → Upload** → escolha `koinonya-captura.zip`.
4. Rode:

   ```bash
   unzip -o koinonya-captura.zip && bash koinonya-captura/scripts/firebase-capture/cloudshell.sh
   ```

5. Ao final aparece `~/koinonya-captura-<data>.zip`. Baixe com `cloudshell download ~/koinonya-captura-<data>.zip` (ou **⋮ → Download**) e descompacte em `exports/firebase/`.

Se o Cloud Shell não entregar credencial padrão, o script pede `gcloud auth application-default login --no-launch-browser`: abre um link no navegador, você copia o código e cola de volta. Continua sendo tudo no navegador.

Para baixar também os arquivos do Storage: `bash koinonya-captura/scripts/firebase-capture/cloudshell.sh --download-storage`.

## 3. Alternativa: rodar na máquina local

**Credencial A — gcloud**

```powershell
winget install Google.CloudSDK
# feche e reabra o terminal
gcloud auth application-default login
gcloud auth application-default set-quota-project gen-lang-client-0519033383
```

**Credencial B — chave de service account**

Console Firebase → Configurações do projeto → Contas de serviço → *Gerar nova chave privada*. Salve **fora do repositório** e aponte:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\chaves\koinonya-legado-service-account.json"
```

A chave dá acesso total ao projeto. Apague-a (no console e no disco) quando a migração terminar. A service account padrão do Admin SDK pode não ter permissão para ler regras e config do Auth; nesse caso essas seções aparecem como falha no `manifest.json` e o restante sai normalmente.

**Rodar**

```powershell
pnpm --dir scripts/firebase-capture install
pnpm --dir scripts/firebase-capture capture                      # dados + estrutura
pnpm --dir scripts/firebase-capture capture --download-storage   # idem + arquivos do Storage
```

Saída em `exports/firebase/<data-hora>/` (ignorada pelo git, contém dados pessoais de teste):

| Arquivo | Conteúdo | Uso na migração |
| --- | --- | --- |
| `firestore/schema.md` / `schema.json` | Campos por coleção, tipos, opcionais, tamanho máximo, candidatos a enum | Base das migrations SQL |
| `firestore/data/*.ndjson` | Um documento por linha, tipos preservados (`timestamp`, `ref`, `geopoint`, `bytes`). Campos de senha/segredo saem como `{"__type":"redacted"}` | Seed/import no Postgres |
| `firestore/indexes.json`, `field-overrides.json` | Índices compostos e TTL | Índices equivalentes no Postgres |
| `firestore/database.json` | Região, tipo, PITR | Registro |
| `rules/firestore.rules` + `diff-vs-repo.txt` | Regras **publicadas** e se diferem do repositório | Políticas RLS |
| `rules/storage.rules` | Regras do Storage | Políticas do Supabase Storage |
| `auth/users.ndjson` | Usuários, provedores, claims (sem hash de senha) | Recriar contas de teste |
| `auth/config.json` | Provedores, domínios autorizados | Config do Supabase Auth |
| `storage/objects.ndjson` | Lista de objetos | Planejar upload |
| `manifest.json` | Contagens, erros por seção, sha256 | Conferência |

Coleções e subcoleções são descobertas automaticamente (`listCollections`), inclusive documentos "fantasma" que só existem como pai de subcoleção.

## 4. Backup bruto opcional (exportação gerenciada)

Gera cópia restaurável no próprio GCP, em formato binário (não legível). Exige faturamento ativo (plano Blaze); o projeto hoje está no Spark, então este passo não roda sem upgrade.

```powershell
gcloud storage buckets create gs://koinonya-legado-backup --location=southamerica-east1 --project=gen-lang-client-0519033383
gcloud firestore export gs://koinonya-legado-backup/$(Get-Date -Format yyyyMMdd) --database=ai-studio-56e15dbb-ab27-47d4-a16d-0dd5e607f1f4 --project=gen-lang-client-0519033383
```

Como o banco tem só dados de teste, a captura do passo 3 basta.

## 5. Último recurso: manual pelo console

Se nada acima funcionar, dá para recuperar a estrutura (não os dados em massa) pelo console:

- **Regras:** Firestore → Regras → copiar o texto publicado.
- **Índices:** Firestore → Índices → print das abas Composto e Isenções.
- **Usuários:** Authentication → Usuários → print da lista (o console não exporta).
- **Dados:** Firestore → Editor de consultas, uma coleção por vez. Lento e sem tipos; só para conferência.

## 6. Senha em texto puro em `users`

Versões antigas do app gravaram `users/{id}.password` em texto puro. O código atual já descarta o campo ao salvar ([services/db.ts](../../services/db.ts)), mas os documentos antigos continuam com ele, e as regras atuais deixam usuários da mesma organização lerem `users`. A captura mascara o valor e conta as ocorrências em `manifest.json → counts.redacted_fields`.

Ação recomendada: apagar o campo `password` desses documentos no console e trocar a senha das contas afetadas, se ela for a mesma do login.

## 7. Depois da captura

1. Conferir `manifest.json`: todas as seções `ok: true`.
2. Comparar `schema.md` com [INVENTARIO_FIREBASE.md](INVENTARIO_FIREBASE.md) e `types.ts`; registrar divergências.
3. Escrever as migrations do Supabase a partir do esquema observado.
