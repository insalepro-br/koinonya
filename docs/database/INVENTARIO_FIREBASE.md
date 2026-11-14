# Inventário do Firebase atual

Captura local de 12 de novembro de 2026, baseada no código do commit `0a037cc`.

O arquivo `firebase-applet-config.json` aponta para o projeto `gen-lang-client-0519033383` e o banco nomeado `ai-studio-56e15dbb-ab27-47d4-a16d-0dd5e607f1f4`. Esses identificadores foram registrados no manifesto para orientar uma futura captura autenticada.

O inventário abaixo foi inferido do código. O estado remoto dos documentos, índices, regras publicadas, Auth e Storage está pendente de verificação. As CLIs `firebase` e `gcloud` e os arquivos padrão de credenciais consultados estavam ausentes nesta sessão. Docker e Node foram localizados no PATH.

**Arquivos da captura local**

| Arquivo no ZIP | Informação preservada |
| --- | --- |
| `types.ts` | 27 interfaces e seus tipos, enums e campos opcionais |
| `firestore.rules` | Regras presentes no repositório |
| `firebase-blueprint.json` | Blueprint com 17 entidades |
| `security_spec.md` | Requisitos de segurança declarados |
| `services/db.ts` | Consultas, gravações, conversões, seeds e chamadas em tempo real |
| `lib/firebase.ts` | Inicialização do cliente e seleção do banco |
| `utils/exportImportHelpers.ts` | Contrato do exportador e importador atual |
| `inventory.json` | Coleções e campos inferidos das fontes locais |
| `manifest.json` | Identificação, origem, hashes e estado da verificação remota |

[Baixar a captura](firebase-local-structure-2026-11-12.zip) · [Ler o manifesto](firebase-local-structure-2026-11-12.manifest.json)

**Coleções encontradas e desenho SQL candidato**

O serviço de dados referencia 22 coleções de negócio. O mapeamento abaixo orienta o desenho das migrations e exige validação de negócio antes da implementação.

| Coleção atual | Tipo principal | Destino SQL proposto e ajustes |
| --- | --- | --- |
| `organizations` | `Organization` | Organizações, configuração de assinatura, etapas de pipeline e níveis de acesso |
| `users` | `SystemUser` | Perfis, vínculos com organizações e igrejas. Identidade ligada ao Auth do provedor |
| `churches` | `Church` | Igrejas vinculadas à organização, com projeção pública controlada |
| `members` | `Member` | Membros, vínculos familiares e referências a célula, liderança e discipulado |
| `events` | `ScheduleEvent` | Compromissos da agenda, com responsáveis e datas validadas |
| `cells` | `Cell` | Células, liderança e dados de reunião |
| `cell_meetings` | `CellMeeting` | Reuniões vinculadas à célula e igreja. Conferir o `church_id` atualmente opcional |
| `automation_rules` | `AutomationRule` | Regras de comunicação, gatilho, atraso e configuração |
| `financial_transactions` | `FinancialTransaction` | Lançamentos com valores exatos, campanha e membro opcionais |
| `financial_campaigns` | `FinancialCampaign` | Campanhas e metas, com arrecadação calculada ou atualizada por operação controlada |
| `discipleship_tracks` | `DiscipleshipTrack` | Trilhas e tabela de etapas |
| `member_track_progress` | `MemberTrackProgress` | Matrículas/progresso e conclusões de etapas |
| `message_logs` | `MessageLog` | Histórico de comunicação e situação efetivamente confirmada |
| `broadcast_campaigns` | `BroadcastCampaign` | Campanhas, destinatários e resultados por destinatário |
| `ministries` | `Ministry` | Ministérios, funções e vínculo de voluntários |
| `ministry_schedules` | `MinistrySchedule` | Escalas e atribuições normalizadas |
| `service_checkins` | `ServiceCheckin` | Presenças e retiradas. Verificação Kids e auditoria em acesso restrito |
| `prayer_requests` | `PrayerRequest` | Pedidos com regras de privacidade, responsáveis e histórico |
| `pastoral_visits` | `PastoralVisit` | Visitas e atendimentos vinculados a pessoas e responsáveis |
| `saas_invoices` | `SaaSInvoice` | Faturas de assinatura com competência e integridade de pagamento |
| `church_events` | `ChurchEvent` | Eventos com vagas, preço e inscrição pública |
| `event_registrations` | `EventRegistration` | Inscrições, ingresso, presença e situação financeira |

Existe ainda uma leitura diagnóstica em `test/connection`. O tipo `Household` aparece em `types.ts`, enquanto o serviço de dados não referencia uma coleção `households`. Campos familiares existem nos membros. A migração deve verificar o fluxo de famílias antes de definir uma tabela e importar vínculos.

**Estruturas embutidas a avaliar**

| Campo atual | Tratamento proposto |
| --- | --- |
| `Organization.pipeline_stages` | Etapas por organização, com ordem e referências estáveis |
| `Organization.access_levels` e `SystemUser.permissions` | Papéis, permissões e vínculos com delegação controlada |
| `DiscipleshipTrack.steps` | Etapas da trilha em tabela relacionada |
| `completed_step_ids` e `step_completion_dates` | Conclusões de etapa com data e identidade do responsável |
| `BroadcastCampaign.recipient_ids` e `sent_member_ids` | Destinatários e situação por destinatário |
| `Ministry.volunteer_ids` | Vínculo entre ministério e participante |
| `MinistrySchedule.assignments` | Atribuições de escala com responsável, função e confirmação |
| Nomes e títulos duplicados | Definir quais campos guardam histórico e quais devem ser obtidos por relacionamento |

Em várias coleções, os nomes referenciados e percentuais são duplicados para exibição. Cada conversão deve identificar a fonte de verdade e a necessidade de preservar um valor histórico. Campos financeiros, contadores, etapas e permissões precisam de regras explícitas de atualização.

**Pontos de adaptação no código**

- `services/db.ts` concentra CRUD, consultas e 25 chamadas `onSnapshot`. Definir equivalência para consulta inicial, atualização, exclusão, reconexão, erro e cancelamento da assinatura.
- `App.tsx` observa a sessão, encerra login, altera senha e organiza subscriptions e seeds.
- `components/LoginScreen.tsx` usa Auth e grava perfil, organização e igreja sequencialmente.
- `services/geminiService.ts` e `components/AnalyticsDashboard.tsx` obtêm tokens para chamar a API.
- `components/ChurchModule.tsx` e `lib/firebase.ts` completam os sete arquivos com referências diretas a Firebase localizados na revisão.
- `utils/exportImportHelpers.ts` exporta apenas parte do domínio. O inventário completo precisa abranger as demais coleções.

**Captura do estado remoto a executar com autenticação**

1. Confirmar projeto, banco nomeado, região, modo e acesso administrativo. Registrar o instante e a identidade operacional da captura, mantendo credenciais em armazenamento protegido.
2. Obter as regras efetivamente publicadas para esse banco e compará-las com `firestore.rules`.
3. Capturar índices compostos, configurações de campos e TTL, além de configurações relevantes do banco.
4. Enumerar coleções e subcoleções. Registrar caminhos, quantidades, campos observados, tipos e variações. Para uma cópia integral, usar exportação gerenciada ou leitura administrativa paginada com preservação de tipos.
5. Preservar timestamps com precisão, referências completas, números, mapas, listas, valores nulos, bytes e coordenadas geográficas que existirem. Documentar qualquer normalização para JSON.
6. Inventariar os usuários de teste do Auth, provedores, domínios e vínculos por UID. Criar dados fictícios equivalentes no ambiente novo.
7. Inventariar buckets, objetos e regras de Storage se forem utilizados. Imagens embutidas nos documentos também entram na análise de conversão.
8. Conferir contagens e hashes, registrar arquivos do pacote e testar sua restauração ou leitura em ambiente isolado.

A exportação gerenciada do Firestore armazena documentos no Cloud Storage, exige faturamento habilitado e gera leituras cobradas. Os índices precisam ser capturados separadamente. Uma exportação pode incluir mudanças ocorridas durante sua execução, portanto a consistência da captura deve ser registrada e validada. [Exportação Firestore](https://firebase.google.com/docs/firestore/manage-data/export-import)

**Critério para declarar o inventário completo**

O pacote deve conter fontes locais, estado remoto verificado, esquema observado, regras publicadas, índices, configuração e instruções de restauração. A captura atual entrega as fontes locais e o esquema inferido. Essa origem está registrada no nome do arquivo e no manifesto.
