-- Koinonya: Row Level Security.
--
-- Equivalência com o firestore.rules, com estas correções de segurança:
-- * Ninguém cria o próprio perfil escolhendo role/org: perfis nascem pelo onboarding (RPC) ou por admin.
-- * Ninguém (exceto SUPER_ADMIN) concede SUPER_ADMIN.
-- * Acesso por módulo segue as permissões dos níveis de acesso (contatos_view, financeiro_view…),
--   não apenas "pertence à organização". Pedido de oração PASTOR_CONFIDENTIAL só para ADMIN/PASTOR.
-- * Campos de cobrança da organização só mudam por SUPER_ADMIN.
--
-- Funções auxiliares ficam no schema "app", que não é exposto pela API.

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to anon, authenticated, service_role;

-- ---------------------------------------------------------------- quem está chamando
create or replace function app.profile()
returns public.users
language sql stable security definer set search_path = '' as $$
  select u.* from public.users u where u.auth_user_id = (select auth.uid())
$$;

create or replace function app.user_id() returns text
language sql stable security definer set search_path = '' as $$
  select u.id from public.users u where u.auth_user_id = (select auth.uid())
$$;

create or replace function app.org_id() returns text
language sql stable security definer set search_path = '' as $$
  select u.org_id from public.users u where u.auth_user_id = (select auth.uid())
$$;

create or replace function app.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select u.role = 'SUPER_ADMIN' from public.users u where u.auth_user_id = (select auth.uid())), false)
$$;

-- Pertence à organização (ou é SUPER_ADMIN).
create or replace function app.in_org(target_org text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_super_admin()
      or exists (select 1 from public.users u where u.auth_user_id = (select auth.uid()) and u.org_id = target_org)
$$;

-- ADMIN ou PASTOR da organização (equivale ao isOrgAdmin do Firestore).
create or replace function app.is_org_admin(target_org text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_super_admin()
      or exists (
        select 1 from public.users u
        where u.auth_user_id = (select auth.uid()) and u.org_id = target_org and u.role in ('ADMIN', 'PASTOR')
      )
$$;

create or replace function app.default_permissions(role text) returns text[]
language sql immutable set search_path = '' as $$
  select case role
    when 'PASTOR' then array[
      'contatos_view','contatos_edit','pipeline_view','pipeline_edit','celulas_view','celulas_edit',
      'discipulado_view','discipulado_edit','ministries_view','ministries_edit','checkin_view','checkin_edit',
      'pastoral_view','pastoral_edit','events_view','events_edit','financeiro_view','agenda_view','agenda_edit',
      'equipe_view','automation_manage','ai_insights']
    when 'LEADER' then array[
      'contatos_view','contatos_edit','pipeline_view','celulas_view','celulas_edit','discipulado_view',
      'ministries_view','ministries_edit','checkin_view','checkin_edit','pastoral_view','pastoral_edit',
      'events_view','events_edit','agenda_view','agenda_edit','automation_manage']
    when 'RECEPTION' then array[
      'contatos_view','contatos_edit','pipeline_view','checkin_view','checkin_edit','pastoral_view',
      'events_view','agenda_view']
    when 'VOLUNTEER' then array['contatos_view','checkin_view','pastoral_view','events_view','agenda_view']
    else array[]::text[]
  end
$$;

-- Permissão de módulo. ADMIN e 'all' têm tudo; os demais papéis seguem users.permissions,
-- com fallback para os níveis padrão quando o perfil não tem lista própria.
create or replace function app.can(target_org text, permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.is_super_admin() or exists (
    select 1 from public.users u
    where u.auth_user_id = (select auth.uid())
      and u.org_id = target_org
      and (
        u.role = 'ADMIN'
        or 'all' = any (u.permissions)
        or permission = any (u.permissions)
        or (
          cardinality(array_remove(u.permissions, 'standard')) = 0
          and permission = any (app.default_permissions(u.role))
        )
      )
  )
$$;

revoke all on all functions in schema app from public;
grant execute on all functions in schema app to anon, authenticated, service_role;

-- ---------------------------------------------------------------- travas por trigger
-- As travas valem para escrita direta pela API (current_user = authenticated). Passam direto:
-- service_role, migrations/importação e funções SECURITY DEFINER do próprio banco (onboarding, RPCs
-- públicas), onde current_user é o dono da função. Por isso os triggers são SECURITY INVOKER.

create or replace function app.guard_users() returns trigger
language plpgsql set search_path = '' as $$
declare
  caller_id   text := app.user_id();
  caller_org  text := app.org_id();
  is_super    boolean := app.is_super_admin();
begin
  if current_user not in ('authenticated', 'anon') or is_super then
    return new;
  end if;

  if new.role = 'SUPER_ADMIN' then
    raise exception 'Somente SUPER_ADMIN concede SUPER_ADMIN.' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.org_id is distinct from caller_org or not app.can(caller_org, 'equipe_edit') then
      raise exception 'Sem permissão para cadastrar equipe nesta organização.' using errcode = '42501';
    end if;
    if new.auth_user_id is not null then
      raise exception 'Vínculo com login é feito pelo sistema.' using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.auth_user_id is distinct from old.auth_user_id or new.id <> old.id then
    raise exception 'Vínculo com login é feito pelo sistema.' using errcode = '42501';
  end if;
  if new.org_id is distinct from old.org_id then
    raise exception 'Não é permitido mover usuário de organização.' using errcode = '42501';
  end if;

  if app.can(old.org_id, 'equipe_edit') then
    return new; -- admin da organização (role/permissões dentro da própria org)
  end if;

  if old.id = caller_id then
    if new.role is distinct from old.role
       or new.permissions is distinct from old.permissions
       or new.church_id is distinct from old.church_id
       or lower(new.email) is distinct from lower(old.email) then
      raise exception 'Você só pode alterar seus dados pessoais.' using errcode = '42501';
    end if;
    return new;
  end if;

  raise exception 'Sem permissão para alterar este usuário.' using errcode = '42501';
end;
$$;

create trigger users_guard before insert or update on public.users
  for each row execute function app.guard_users();

create or replace function app.guard_organizations() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') or app.is_super_admin() then
    return new;
  end if;
  if new.subscription_status is distinct from old.subscription_status
     or new.plan is distinct from old.plan
     or new.monthly_price is distinct from old.monthly_price
     or new.max_members is distinct from old.max_members
     or new.billing_cycle is distinct from old.billing_cycle
     or new.next_billing_date is distinct from old.next_billing_date
     or new.trial_ends_at is distinct from old.trial_ends_at
     or new.active is distinct from old.active
     or new.owner_id is distinct from old.owner_id then
    raise exception 'Dados de assinatura só podem ser alterados pela administração do SaaS.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger organizations_guard before update on public.organizations
  for each row execute function app.guard_organizations();

-- org_id/church_id não mudam depois de criados (evita mover registro para outro inquilino).
create or replace function app.guard_tenant_keys() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.org_id is distinct from old.org_id then
    raise exception 'org_id é imutável.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------- RLS
alter table public.organizations          enable row level security;
alter table public.churches               enable row level security;
alter table public.users                  enable row level security;
alter table public.members                enable row level security;
alter table public.events                 enable row level security;
alter table public.cells                  enable row level security;
alter table public.cell_meetings          enable row level security;
alter table public.automation_rules       enable row level security;
alter table public.financial_campaigns    enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.discipleship_tracks    enable row level security;
alter table public.member_track_progress  enable row level security;
alter table public.broadcast_campaigns    enable row level security;
alter table public.message_logs           enable row level security;
alter table public.ministries             enable row level security;
alter table public.ministry_schedules     enable row level security;
alter table public.service_checkins       enable row level security;
alter table public.prayer_requests        enable row level security;
alter table public.pastoral_visits        enable row level security;
alter table public.saas_invoices          enable row level security;
alter table public.church_events          enable row level security;
alter table public.event_registrations    enable row level security;

-- organizations
create policy organizations_select on public.organizations for select to authenticated
  using (app.in_org(id) or owner_id = app.user_id());
create policy organizations_insert on public.organizations for insert to authenticated
  with check (app.is_super_admin());
create policy organizations_update on public.organizations for update to authenticated
  using (app.is_org_admin(id)) with check (app.is_org_admin(id));
create policy organizations_delete on public.organizations for delete to authenticated
  using (app.is_super_admin());

-- churches: leitura pública (portal e check-in de visitante usam dados da igreja)
create policy churches_select on public.churches for select to anon, authenticated using (true);
create policy churches_insert on public.churches for insert to authenticated
  with check (app.can(org_id, 'church_edit'));
create policy churches_update on public.churches for update to authenticated
  using (app.can(org_id, 'church_edit')) with check (app.can(org_id, 'church_edit'));
create policy churches_delete on public.churches for delete to authenticated
  using (app.is_org_admin(org_id) and app.can(org_id, 'church_edit'));

-- users (perfis)
create policy users_select on public.users for select to authenticated
  using (auth_user_id = (select auth.uid()) or app.in_org(org_id));
create policy users_insert on public.users for insert to authenticated
  with check (app.can(org_id, 'equipe_edit'));
create policy users_update on public.users for update to authenticated
  using (auth_user_id = (select auth.uid()) or app.can(org_id, 'equipe_edit'))
  with check (auth_user_id = (select auth.uid()) or app.can(org_id, 'equipe_edit'));
create policy users_delete on public.users for delete to authenticated
  using (app.can(org_id, 'equipe_edit') and auth_user_id is distinct from (select auth.uid()));

-- Tabelas de módulo: (tabela, permissão de leitura, permissão de escrita, permissão de exclusão)
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('members',                'contatos_view',    'contatos_edit',    'contatos_delete'),
      ('events',                 'agenda_view',      'agenda_edit',      'agenda_edit'),
      ('cells',                  'celulas_view',     'celulas_edit',     'celulas_edit'),
      ('cell_meetings',          'celulas_view',     'celulas_edit',     'celulas_edit'),
      ('automation_rules',       'automation_manage','automation_manage','automation_manage'),
      ('financial_campaigns',    'financeiro_view',  'financeiro_edit',  'financeiro_edit'),
      ('financial_transactions', 'financeiro_view',  'financeiro_edit',  'financeiro_edit'),
      ('discipleship_tracks',    'discipulado_view', 'discipulado_edit', 'discipulado_edit'),
      ('member_track_progress',  'discipulado_view', 'discipulado_edit', 'discipulado_edit'),
      ('broadcast_campaigns',    'contatos_view',    'contatos_edit',    'contatos_edit'),
      ('message_logs',           'contatos_view',    'contatos_edit',    'contatos_delete'),
      ('ministries',             'ministries_view',  'ministries_edit',  'ministries_edit'),
      ('ministry_schedules',     'ministries_view',  'ministries_edit',  'ministries_edit'),
      ('service_checkins',       'checkin_view',     'checkin_edit',     'checkin_edit'),
      ('pastoral_visits',        'pastoral_view',    'pastoral_edit',    'pastoral_edit'),
      ('church_events',          'events_view',      'events_edit',      'events_edit'),
      ('event_registrations',    'events_view',      'events_edit',      'events_edit')
    ) as v(tbl, perm_view, perm_edit, perm_delete)
  loop
    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated using (app.can(org_id, %2$L))',
      t.tbl, t.perm_view);
    execute format(
      'create policy %1$s_insert on public.%1$I for insert to authenticated with check (app.can(org_id, %2$L))',
      t.tbl, t.perm_edit);
    execute format(
      'create policy %1$s_update on public.%1$I for update to authenticated using (app.can(org_id, %2$L)) with check (app.can(org_id, %2$L))',
      t.tbl, t.perm_edit);
    execute format(
      'create policy %1$s_delete on public.%1$I for delete to authenticated using (app.can(org_id, %2$L))',
      t.tbl, t.perm_delete);
    execute format(
      'create trigger %1$s_tenant_keys before update on public.%1$I for each row execute function app.guard_tenant_keys()',
      t.tbl);
  end loop;
end;
$$;

create trigger churches_tenant_keys before update on public.churches
  for each row execute function app.guard_tenant_keys();

-- Eventos públicos: anônimos veem só os abertos para inscrição.
create policy church_events_public_select on public.church_events for select to anon
  using (allow_public_registration and active);

-- prayer_requests: privacidade por papel
create policy prayer_requests_select on public.prayer_requests for select to authenticated using (
  app.can(org_id, 'pastoral_view')
  and (
    privacy = 'PUBLIC_CHURCH'
    or (privacy = 'LEADERS_ONLY' and (app.is_super_admin() or (app.profile()).role not in ('VOLUNTEER', 'RECEPTION')))
    or (privacy = 'PASTOR_CONFIDENTIAL' and (app.is_super_admin() or (app.profile()).role in ('ADMIN', 'PASTOR')))
  )
);
create policy prayer_requests_insert on public.prayer_requests for insert to authenticated
  with check (app.can(org_id, 'pastoral_edit'));
create policy prayer_requests_update on public.prayer_requests for update to authenticated
  using (app.can(org_id, 'pastoral_edit')) with check (app.can(org_id, 'pastoral_edit'));
create policy prayer_requests_delete on public.prayer_requests for delete to authenticated
  using (app.can(org_id, 'pastoral_edit'));
create trigger prayer_requests_tenant_keys before update on public.prayer_requests
  for each row execute function app.guard_tenant_keys();

-- saas_invoices: organização vê as próprias (admins); só SUPER_ADMIN escreve
create policy saas_invoices_select on public.saas_invoices for select to authenticated
  using (app.is_org_admin(org_id));
create policy saas_invoices_write on public.saas_invoices for all to authenticated
  using (app.is_super_admin()) with check (app.is_super_admin());

-- ---------------------------------------------------------------- privilégios de tabela
-- anon não acessa tabelas diretamente, exceto leitura de churches e church_events (filtrada por RLS).
revoke all on all tables in schema public from anon;
grant select on public.churches, public.church_events to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------- Realtime (substitui onSnapshot)
alter publication supabase_realtime add table
  public.organizations, public.churches, public.users, public.members, public.events, public.cells,
  public.cell_meetings, public.automation_rules, public.financial_campaigns, public.financial_transactions,
  public.discipleship_tracks, public.member_track_progress, public.broadcast_campaigns, public.message_logs,
  public.ministries, public.ministry_schedules, public.service_checkins, public.prayer_requests,
  public.pastoral_visits, public.saas_invoices, public.church_events, public.event_registrations;
