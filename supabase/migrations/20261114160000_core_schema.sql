-- Koinonya: esquema base (migração do Firestore).
--
-- Decisões:
-- * IDs são text: preservam os IDs do Firestore na importação; novos registros recebem UUID em texto.
-- * Toda tabela de negócio carrega org_id e church_id. A FK composta (church_id, org_id) garante que
--   a igreja pertence à mesma organização (sem referência cruzada entre inquilinos).
-- * Valores monetários em numeric(12,2) (reais). Datas em timestamptz.
-- * Domínios fechados como text + CHECK (mais fáceis de evoluir que enum do Postgres).
-- * Estruturas que o app trata como valor do pai (pipeline_stages, access_levels, steps, assignments)
--   ficam em jsonb nesta fase; listas de IDs em text[]. Normalização fica para uma fase seguinte.
-- * users não tem coluna de senha: autenticação é do Supabase Auth.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.new_id() returns text
language sql volatile set search_path = '' as $$ select extensions.gen_random_uuid()::text $$;

-- ---------------------------------------------------------------- organizations
create table public.organizations (
  id                   text primary key default public.new_id(),
  name                 text not null check (char_length(name) between 1 and 200),
  plan                 text not null default 'IGREJA' check (char_length(plan) <= 40),
  owner_id             text,
  owner_name           text,
  owner_email          text,
  owner_phone          text,
  active               boolean not null default true,
  lgpd_consent_version text not null default 'v1.0',
  pipeline_stages      jsonb check (pipeline_stages is null or jsonb_typeof(pipeline_stages) = 'array'),
  access_levels        jsonb check (access_levels is null or jsonb_typeof(access_levels) = 'array'),
  subscription_status  text check (subscription_status in ('ACTIVE','TRIAL','PAST_DUE','SUSPENDED','CANCELED')),
  monthly_price        numeric(12,2) check (monthly_price >= 0),
  billing_cycle        text check (billing_cycle in ('MONTHLY','ANNUAL')),
  next_billing_date    timestamptz,
  trial_ends_at        timestamptz,
  max_members          integer check (max_members >= 0),
  notes                text,
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------- churches
create table public.churches (
  id          text primary key default public.new_id(),
  org_id      text not null references public.organizations(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 200),
  cep         text,
  address     text not null default '',
  city        text,
  state       text check (state is null or state = '' or state ~ '^[A-Z]{2}$'),
  cnpj        text,
  pastor_name text not null default '',
  phone       text not null default '',
  email       text not null default '',
  logo_url    text, -- hoje data-URI (até ~12 KB); mover para o Storage depois
  created_at  timestamptz not null default now(),
  unique (id, org_id)
);
create index churches_org_idx on public.churches (org_id);

-- ---------------------------------------------------------------- users (perfil do app)
create table public.users (
  id                text primary key default public.new_id(), -- UID legado do Firebase ou auth.users.id
  auth_user_id      uuid unique references auth.users(id) on delete set null,
  org_id            text references public.organizations(id) on delete cascade,
  church_id         text,
  name              text not null check (char_length(name) between 1 and 200),
  email             text not null check (email ~ '^[^@\s]+@[^@\s]+$'),
  whatsapp          text,
  role              text not null default 'VOLUNTEER' check (char_length(role) <= 60),
  avatar            text,
  status            text check (status in ('online','busy','offline')),
  permissions       text[] not null default '{}',
  lgpd_consent_date timestamptz,
  duty              text,
  created_at        timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete set null (church_id)
);
create unique index users_email_uidx on public.users (lower(email));
create index users_org_idx on public.users (org_id);

-- ---------------------------------------------------------------- members
create table public.members (
  id                     text primary key default public.new_id(),
  org_id                 text not null references public.organizations(id) on delete cascade,
  church_id              text not null,
  name                   text not null check (char_length(name) between 1 and 200),
  email                  text not null default '',
  phone                  text not null default '',
  cep                    text,
  gender                 text,
  religion               text,
  address                text,
  neighborhood           text,
  city                   text,
  stage                  text not null default 'NEW' check (char_length(stage) <= 64),
  last_activity          timestamptz not null default now(),
  engagement_score       integer not null default 0 check (engagement_score between 0 and 100),
  responsible_leader_id  text,
  registration_date      timestamptz not null default now(),
  channel                text not null default 'MANUAL',
  interests              text,
  notes                  text,
  active                 boolean not null default true,
  deleted_at             timestamptz,
  deleted_by             text,
  household_id           text,
  household_name         text,
  household_role         text check (household_role in ('HEAD','SPOUSE','CHILD','OTHER')),
  cell_id                text,
  mentor_id              text,
  mentor_name            text,
  active_track_id        text,
  active_track_title     text,
  track_progress_percent integer check (track_progress_percent between 0 and 100),
  created_at             timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index members_org_church_idx on public.members (org_id, church_id);
create index members_stage_idx on public.members (org_id, stage) where deleted_at is null;

-- ---------------------------------------------------------------- events (agenda)
create table public.events (
  id             text primary key default public.new_id(),
  org_id         text not null references public.organizations(id) on delete cascade,
  church_id      text not null,
  title          text not null check (char_length(title) between 1 and 200),
  description    text,
  start_date     timestamptz not null,
  end_date       timestamptz not null,
  location       text,
  type           text not null check (type in ('SERVICE','MEETING','EVENT','FOLLOW_UP','VISIT')),
  member_id      text references public.members(id) on delete set null,
  responsible_id text,
  created_at     timestamptz not null default now(),
  check (end_date >= start_date),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index events_org_start_idx on public.events (org_id, start_date);

-- ---------------------------------------------------------------- cells
create table public.cells (
  id              text primary key default public.new_id(),
  org_id          text not null references public.organizations(id) on delete cascade,
  church_id       text not null,
  name            text not null check (char_length(name) between 1 and 200),
  leader_id       text not null,
  co_leader_id    text,
  host_name       text,
  meeting_day     text not null check (meeting_day in ('SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA','SABADO','DOMINGO')),
  meeting_time    text not null check (meeting_time ~ '^\d{2}:\d{2}$'),
  address         text,
  neighborhood    text,
  target_audience text,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index cells_org_idx on public.cells (org_id);

alter table public.members
  add constraint members_cell_fk foreign key (cell_id) references public.cells(id) on delete set null;

create table public.cell_meetings (
  id              text primary key default public.new_id(),
  org_id          text not null references public.organizations(id) on delete cascade,
  church_id       text not null,
  cell_id         text not null references public.cells(id) on delete cascade,
  date            timestamptz not null,
  theme           text,
  attendees_count integer not null default 0 check (attendees_count >= 0),
  visitors_count  integer not null default 0 check (visitors_count >= 0),
  notes           text,
  created_at      timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index cell_meetings_cell_idx on public.cell_meetings (cell_id, date desc);

-- ---------------------------------------------------------------- automation_rules
create table public.automation_rules (
  id                  text primary key default public.new_id(),
  org_id              text not null references public.organizations(id) on delete cascade,
  church_id           text not null,
  name                text not null check (char_length(name) between 1 and 200),
  trigger_type        text not null check (trigger_type in ('CHECKIN_NEW','STAGE_CHANGE','INACTIVITY_ALERT','FOLLOW_UP_D1','FOLLOW_UP_D3','FOLLOW_UP_D7')),
  delay_days          integer not null default 0 check (delay_days between 0 and 365),
  template_text       text not null check (char_length(template_text) <= 4000),
  use_ai_humanization boolean not null default false,
  active              boolean not null default true,
  target_stage        text,
  created_at          timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index automation_rules_org_idx on public.automation_rules (org_id);

-- ---------------------------------------------------------------- financeiro
create table public.financial_campaigns (
  id            text primary key default public.new_id(),
  org_id        text not null references public.organizations(id) on delete cascade,
  church_id     text not null,
  title         text not null check (char_length(title) between 1 and 200),
  description   text,
  target_amount numeric(12,2) not null default 0 check (target_amount >= 0),
  raised_amount numeric(12,2) not null default 0 check (raised_amount >= 0),
  start_date    timestamptz not null,
  end_date      timestamptz,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index financial_campaigns_org_idx on public.financial_campaigns (org_id);

create table public.financial_transactions (
  id             text primary key default public.new_id(),
  org_id         text not null references public.organizations(id) on delete cascade,
  church_id      text not null,
  type           text not null check (type in ('TITHE','OFFERING','CAMPAIGN','EXPENSE')),
  amount         numeric(12,2) not null check (amount >= 0),
  description    text not null default '',
  category       text not null default '',
  date           timestamptz not null,
  member_id      text references public.members(id) on delete set null,
  member_name    text,
  campaign_id    text references public.financial_campaigns(id) on delete set null,
  payment_method text not null check (payment_method in ('PIX','CREDIT_CARD','DEBIT_CARD','CASH','BANK_TRANSFER')),
  notes          text,
  created_at     timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index financial_transactions_org_date_idx on public.financial_transactions (org_id, date desc);

-- ---------------------------------------------------------------- discipulado
create table public.discipleship_tracks (
  id          text primary key default public.new_id(),
  org_id      text not null references public.organizations(id) on delete cascade,
  church_id   text not null,
  title       text not null check (char_length(title) between 1 and 200),
  description text not null default '',
  category    text not null check (category in ('INTEGRATION','DOCTRINE','LEADERSHIP','MINISTRY')),
  steps       jsonb not null default '[]' check (jsonb_typeof(steps) = 'array'),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index discipleship_tracks_org_idx on public.discipleship_tracks (org_id);

create table public.member_track_progress (
  id                    text primary key default public.new_id(),
  org_id                text not null references public.organizations(id) on delete cascade,
  church_id             text not null,
  member_id             text not null references public.members(id) on delete cascade,
  member_name           text,
  track_id              text not null references public.discipleship_tracks(id) on delete cascade,
  track_title           text,
  mentor_id             text,
  mentor_name           text,
  completed_step_ids    text[] not null default '{}',
  step_completion_dates jsonb check (step_completion_dates is null or jsonb_typeof(step_completion_dates) = 'object'),
  notes                 text,
  started_at            timestamptz not null default now(),
  completed_at          timestamptz,
  status                text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS','COMPLETED','PAUSED')),
  progress_percent      integer not null default 0 check (progress_percent between 0 and 100),
  created_at            timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index member_track_progress_member_idx on public.member_track_progress (member_id);
create index member_track_progress_org_idx on public.member_track_progress (org_id);

-- ---------------------------------------------------------------- comunicação
create table public.broadcast_campaigns (
  id               text primary key default public.new_id(),
  org_id           text not null references public.organizations(id) on delete cascade,
  church_id        text not null,
  title            text not null check (char_length(title) between 1 and 200),
  segment_label    text not null default '',
  template_text    text not null check (char_length(template_text) <= 4000),
  total_recipients integer not null default 0 check (total_recipients >= 0),
  sent_count       integer not null default 0 check (sent_count >= 0),
  recipient_ids    text[] not null default '{}',
  sent_member_ids  text[] not null default '{}',
  created_by_name  text,
  created_at       timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index broadcast_campaigns_org_idx on public.broadcast_campaigns (org_id, created_at desc);

create table public.message_logs (
  id            text primary key default public.new_id(),
  org_id        text not null references public.organizations(id) on delete cascade,
  church_id     text not null,
  member_id     text references public.members(id) on delete set null,
  member_name   text not null default '',
  member_phone  text not null default '',
  channel       text not null check (channel in ('WHATSAPP','BULK_CAMPAIGN','AUTOMATION_RULE')),
  campaign_id   text references public.broadcast_campaigns(id) on delete set null,
  campaign_name text,
  rule_id       text references public.automation_rules(id) on delete set null,
  message_text  text not null check (char_length(message_text) <= 4000),
  sent_by_id    text,
  sent_by_name  text,
  sent_at       timestamptz not null default now(),
  status        text not null check (status in ('SENT','OPENED_WA','FAILED')),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index message_logs_org_sent_idx on public.message_logs (org_id, sent_at desc);
create index message_logs_member_idx on public.message_logs (member_id);

-- ---------------------------------------------------------------- ministérios
create table public.ministries (
  id            text primary key default public.new_id(),
  org_id        text not null references public.organizations(id) on delete cascade,
  church_id     text not null,
  name          text not null check (char_length(name) between 1 and 200),
  description   text,
  leader_id     text,
  leader_name   text,
  default_roles text[] not null default '{}',
  volunteer_ids text[] not null default '{}',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index ministries_org_idx on public.ministries (org_id);

create table public.ministry_schedules (
  id              text primary key default public.new_id(),
  org_id          text not null references public.organizations(id) on delete cascade,
  church_id       text not null,
  ministry_id     text not null references public.ministries(id) on delete cascade,
  ministry_name   text not null default '',
  event_id        text,
  event_title     text not null default '',
  service_date    timestamptz not null,
  start_time      text not null check (start_time ~ '^\d{2}:\d{2}$'),
  end_time        text check (end_time is null or end_time = '' or end_time ~ '^\d{2}:\d{2}$'),
  assignments     jsonb not null default '[]' check (jsonb_typeof(assignments) = 'array'),
  notes           text,
  created_by_name text,
  created_at      timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index ministry_schedules_org_date_idx on public.ministry_schedules (org_id, service_date);

-- ---------------------------------------------------------------- check-in
create table public.service_checkins (
  id              text primary key default public.new_id(),
  org_id          text not null references public.organizations(id) on delete cascade,
  church_id       text not null,
  event_id        text,
  event_title     text not null default '',
  service_date    timestamptz not null,
  checkin_type    text not null check (checkin_type in ('SERVICE','KIDS','EVENT')),
  person_id       text,
  person_name     text not null check (char_length(person_name) between 1 and 200),
  person_phone    text,
  household_name  text,
  is_visitor      boolean not null default false,
  kids_room       text,
  guardian_name   text,
  guardian_phone  text,
  security_code   text,
  allergies_notes text,
  status          text not null default 'CHECKED_IN' check (status in ('CHECKED_IN','CHECKED_OUT')),
  checked_in_at   timestamptz not null default now(),
  checked_out_at  timestamptz,
  checked_in_by   text,
  checked_out_by  text,
  created_at      timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index service_checkins_org_date_idx on public.service_checkins (org_id, service_date desc);

-- ---------------------------------------------------------------- cuidado pastoral
create table public.prayer_requests (
  id              text primary key default public.new_id(),
  org_id          text not null references public.organizations(id) on delete cascade,
  church_id       text not null,
  member_id       text references public.members(id) on delete set null,
  requester_name  text not null check (char_length(requester_name) between 1 and 200),
  requester_phone text,
  category        text not null check (category in ('HEALTH','FAMILY','FINANCE','SPIRITUAL','THANKSGIVING','OTHER')),
  urgency         text not null default 'NORMAL' check (urgency in ('NORMAL','URGENT')),
  privacy         text not null default 'LEADERS_ONLY' check (privacy in ('PUBLIC_CHURCH','LEADERS_ONLY','PASTOR_CONFIDENTIAL')),
  request_text    text not null check (char_length(request_text) between 1 and 4000),
  status          text not null default 'RECEIVED' check (status in ('RECEIVED','IN_PRAYER','ANSWERED')),
  prayer_count    integer not null default 0 check (prayer_count >= 0),
  source          text not null default 'MANUAL' check (source in ('QR_CODE','MANUAL','CELL','CHECKIN')),
  testimony_notes text,
  answered_at     timestamptz,
  created_at      timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index prayer_requests_org_idx on public.prayer_requests (org_id, created_at desc);

create table public.pastoral_visits (
  id                text primary key default public.new_id(),
  org_id            text not null references public.organizations(id) on delete cascade,
  church_id         text not null,
  member_id         text references public.members(id) on delete set null,
  member_name       text not null check (char_length(member_name) between 1 and 200),
  member_phone      text,
  address_info      text,
  visit_type        text not null check (visit_type in ('HOME_VISIT','HOSPITAL','COUNSELING','CALL','NEW_CONVERT')),
  scheduled_date    timestamptz not null,
  scheduled_time    text,
  responsible_id    text,
  responsible_name  text,
  status            text not null default 'SCHEDULED' check (status in ('SCHEDULED','COMPLETED','CANCELED')),
  prayer_request_id text references public.prayer_requests(id) on delete set null,
  notes             text,
  completed_at      timestamptz,
  created_by_name   text,
  created_at        timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index pastoral_visits_org_date_idx on public.pastoral_visits (org_id, scheduled_date);

-- ---------------------------------------------------------------- SaaS
create table public.saas_invoices (
  id              text primary key default public.new_id(),
  org_id          text not null references public.organizations(id) on delete cascade,
  org_name        text not null default '',
  amount          numeric(12,2) not null check (amount >= 0),
  due_date        timestamptz not null,
  paid_at         timestamptz,
  status          text not null default 'PENDING' check (status in ('PENDING','PAID','OVERDUE','CANCELED')),
  payment_method  text not null check (payment_method in ('PIX','BOLETO','CARD','TRANSFER')),
  reference_month text not null check (reference_month ~ '^\d{4}-\d{2}$'),
  pix_code        text,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (org_id, reference_month)
);

-- ---------------------------------------------------------------- eventos com inscrição
create table public.church_events (
  id                        text primary key default public.new_id(),
  org_id                    text not null references public.organizations(id) on delete cascade,
  church_id                 text not null,
  title                     text not null check (char_length(title) between 1 and 200),
  description               text not null default '',
  category                  text not null check (category in ('CONFERENCE','RETREAT','BAPTISM','COURSE','WORKSHOP','SPECIAL_SERVICE')),
  start_date                timestamptz not null,
  start_time                text not null check (start_time ~ '^\d{2}:\d{2}$'),
  location                  text not null default '',
  capacity                  integer not null default 0 check (capacity >= 0),
  registration_fee          numeric(12,2) not null default 0 check (registration_fee >= 0),
  allow_public_registration boolean not null default false,
  status                    text not null default 'OPEN' check (status in ('OPEN','FULL','CLOSED','COMPLETED')),
  active                    boolean not null default true,
  created_by_name           text,
  created_at                timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index church_events_org_start_idx on public.church_events (org_id, start_date);
create index church_events_public_idx on public.church_events (church_id) where allow_public_registration and active;

create table public.event_registrations (
  id                text primary key default public.new_id(),
  org_id            text not null references public.organizations(id) on delete cascade,
  church_id         text not null,
  event_id          text not null references public.church_events(id) on delete cascade,
  event_title       text not null default '',
  member_id         text references public.members(id) on delete set null,
  participant_name  text not null check (char_length(participant_name) between 2 and 200),
  participant_phone text not null check (char_length(participant_phone) between 8 and 32),
  participant_email text,
  ticket_code       text not null unique,
  payment_status    text not null check (payment_status in ('FREE','PENDING','PAID')),
  amount_paid       numeric(12,2) not null default 0 check (amount_paid >= 0),
  status            text not null default 'CONFIRMED' check (status in ('CONFIRMED','CHECKED_IN','CANCELED')),
  source            text not null check (source in ('PUBLIC_PORTAL','MANUAL')),
  notes             text,
  checked_in_at     timestamptz,
  created_at        timestamptz not null default now(),
  foreign key (church_id, org_id) references public.churches (id, org_id) on delete cascade
);
create index event_registrations_event_idx on public.event_registrations (event_id);
create index event_registrations_org_idx on public.event_registrations (org_id);
