-- Testes de RLS e das funções públicas. Rodar: pnpm db:test (supabase test db).
-- Fixtures próprias, tudo dentro de uma transação desfeita no fim.
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

-- ---------------------------------------------------------------- fixtures (como postgres)
insert into auth.users (id, email, aud, role, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@a.test',     'authenticated', 'authenticated', now()),
  ('00000000-0000-0000-0000-0000000000a2', 'vol@a.test',       'authenticated', 'authenticated', now()),
  ('00000000-0000-0000-0000-0000000000b1', 'admin@b.test',     'authenticated', 'authenticated', now()),
  ('00000000-0000-0000-0000-0000000000c1', 'novo@c.test',      'authenticated', 'authenticated', now()),
  ('00000000-0000-0000-0000-0000000000f1', 'fin@a.test',       'authenticated', 'authenticated', now()),
  ('00000000-0000-0000-0000-0000000000e1', 'depois@a.test',    'authenticated', 'authenticated', now()),
  ('00000000-0000-0000-0000-00000000005a', 'saas@s.test',      'authenticated', 'authenticated', now());

insert into public.organizations (id, name, owner_id, subscription_status) values
  ('org_a', 'Org A', 'u_admin_a', 'ACTIVE'),
  ('org_b', 'Org B', 'u_admin_b', 'ACTIVE'),
  ('org_s', 'Operação SaaS', 'u_saas', 'ACTIVE');
insert into public.churches (id, org_id, name) values
  ('ch_a', 'org_a', 'Igreja A'),
  ('ch_b', 'org_b', 'Igreja B'),
  ('ch_s', 'org_s', 'Sede SaaS');
insert into public.users (id, auth_user_id, org_id, church_id, name, email, role, permissions) values
  ('u_admin_a', '00000000-0000-0000-0000-0000000000a1', 'org_a', 'ch_a', 'Admin A', 'admin@a.test', 'ADMIN', '{all}'),
  ('u_vol_a',   '00000000-0000-0000-0000-0000000000a2', 'org_a', 'ch_a', 'Vol A',   'vol@a.test',   'VOLUNTEER', '{}'),
  ('u_admin_b', '00000000-0000-0000-0000-0000000000b1', 'org_b', 'ch_b', 'Admin B', 'admin@b.test', 'ADMIN', '{all}'),
  ('u_fin_a',   '00000000-0000-0000-0000-0000000000f1', 'org_a', 'ch_a', 'Tesoureiro', 'fin@a.test', 'LEADER', '{financeiro_view}'),
  ('u_saas',    '00000000-0000-0000-0000-00000000005a', 'org_s', 'ch_s', 'Operador SaaS', 'saas@s.test', 'SUPER_ADMIN', '{all}');
-- Cadastrado pela equipe DEPOIS de a pessoa já ter conta: o trigger não vincula; claim_profile vincula.
insert into public.users (id, org_id, church_id, name, email, role) values
  ('team_later', 'org_a', 'ch_a', 'Chegou Depois', 'depois@a.test', 'VOLUNTEER');
insert into public.members (id, org_id, church_id, name) values
  ('m_a1', 'org_a', 'ch_a', 'Membro A1'),
  ('m_b1', 'org_b', 'ch_b', 'Membro B1');
insert into public.financial_transactions (id, org_id, church_id, type, amount, date, payment_method) values
  ('tx_a1', 'org_a', 'ch_a', 'TITHE', 100, now(), 'PIX');
insert into public.prayer_requests (id, org_id, church_id, requester_name, category, privacy, request_text) values
  ('pr_pub',  'org_a', 'ch_a', 'Fulano', 'HEALTH', 'PUBLIC_CHURCH',       'pedido público'),
  ('pr_conf', 'org_a', 'ch_a', 'Fulano', 'FAMILY', 'PASTOR_CONFIDENTIAL', 'pedido confidencial');
insert into public.church_events (id, org_id, church_id, title, category, start_date, start_time, capacity, allow_public_registration) values
  ('ev_pub',  'org_a', 'ch_a', 'Conferência', 'CONFERENCE', now() + interval '7 days', '19:00', 1, true),
  ('ev_priv', 'org_a', 'ch_a', 'Reunião interna', 'WORKSHOP', now() + interval '7 days', '19:00', 0, false);

-- Perfil legado (importado) sem login ainda.
insert into public.users (id, org_id, church_id, name, email, role) values
  ('legacy_uid', 'org_a', 'ch_a', 'Legado', 'legado@a.test', 'LEADER');

create function pg_temp.login(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- ---------------------------------------------------------------- vínculo de perfil legado
insert into auth.users (id, email, aud, role, email_confirmed_at)
  values ('00000000-0000-0000-0000-0000000000d1', 'LEGADO@a.test', 'authenticated', 'authenticated', now());
select is((select auth_user_id::text from public.users where id = 'legacy_uid'), '00000000-0000-0000-0000-0000000000d1',
  'login com e-mail confirmado vincula o perfil legado');

insert into public.users (id, org_id, church_id, name, email, role) values
  ('legacy_2', 'org_a', 'ch_a', 'Legado 2', 'legado2@a.test', 'LEADER');
insert into auth.users (id, email, aud, role, email_confirmed_at)
  values ('00000000-0000-0000-0000-0000000000d2', 'legado2@a.test', 'authenticated', 'authenticated', null);
select is((select auth_user_id from public.users where id = 'legacy_2'), null,
  'e-mail não confirmado não vincula perfil');

-- ---------------------------------------------------------------- admin da org A
set local role authenticated;
select pg_temp.login('00000000-0000-0000-0000-0000000000a1');

select is((select count(*)::int from public.members), 1, 'admin A vê só membros da org A');
select is((select count(*)::int from public.financial_transactions), 1, 'admin A vê o financeiro');
select is((select count(*)::int from public.prayer_requests), 2, 'admin A vê pedido confidencial');
select throws_ok(
  $$ insert into public.members (org_id, church_id, name) values ('org_b', 'ch_b', 'Invasor') $$,
  '42501', null, 'admin A não grava na org B');
select throws_ok(
  $$ update public.users set role = 'SUPER_ADMIN' where id = 'u_vol_a' $$,
  '42501', null, 'admin A não concede SUPER_ADMIN');
select lives_ok(
  $$ update public.users set role = 'LEADER' where id = 'u_vol_a' $$,
  'admin A muda papel dentro da própria org');
update public.users set role = 'VOLUNTEER' where id = 'u_vol_a';
select throws_ok(
  $$ update public.organizations set subscription_status = 'ACTIVE', monthly_price = 0 where id = 'org_a' $$,
  '42501', null, 'admin não altera dados de cobrança');
select lives_ok(
  $$ update public.organizations set pipeline_stages = '[]' where id = 'org_a' $$,
  'admin altera configurações da org');
select throws_ok(
  $$ update public.members set org_id = 'org_b' where id = 'm_a1' $$,
  '42501', null, 'org_id é imutável');

select is((select count(*)::int from public.churches where org_id = 'org_b'), 0, 'admin A não vê igrejas da org B');
select is((select count(*)::int from public.users where org_id = 'org_b'), 0, 'admin A não vê equipe da org B');

-- ---------------------------------------------------------------- SUPER_ADMIN (operação do SaaS)
select pg_temp.login('00000000-0000-0000-0000-00000000005a');
select ok((select count(*) from public.organizations where id in ('org_a', 'org_b')) = 2, 'SUPER_ADMIN vê as organizações');
select is((select count(*)::int from public.members where org_id in ('org_a', 'org_b')), 0, 'SUPER_ADMIN não lê membros de outras organizações');
select is((select count(*)::int from public.financial_transactions where org_id = 'org_a'), 0, 'SUPER_ADMIN não lê financeiro de outras organizações');
select is((select count(*)::int from public.users where org_id = 'org_a'), 0, 'SUPER_ADMIN não lê equipe de outras organizações');

-- ---------------------------------------------------------------- vínculo tardio
select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
select is((select (public.claim_profile()).id), 'team_later', 'claim_profile vincula perfil cadastrado depois da conta');

-- ---------------------------------------------------------------- voluntário da org A
select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.members), 1, 'voluntário vê contatos');
select is((select count(*)::int from public.financial_transactions), 0, 'voluntário não vê financeiro');
select is((select count(*)::int from public.prayer_requests), 1, 'voluntário não vê pedido confidencial');
select throws_ok(
  $$ update public.users set role = 'ADMIN' where id = 'u_vol_a' $$,
  '42501', null, 'voluntário não promove a si mesmo');
select lives_ok(
  $$ update public.users set whatsapp = '11999999999', status = 'busy' where id = 'u_vol_a' $$,
  'voluntário edita os próprios dados pessoais');

-- ---------------------------------------------------------------- permissão explícita
select pg_temp.login('00000000-0000-0000-0000-0000000000f1');
select is((select count(*)::int from public.financial_transactions), 1, 'permissão explícita financeiro_view libera leitura');
select throws_ok(
  $$ insert into public.financial_transactions (org_id, church_id, type, amount, date, payment_method)
     values ('org_a', 'ch_a', 'OFFERING', 10, now(), 'CASH') $$,
  '42501', null, 'sem financeiro_edit não lança');

-- ---------------------------------------------------------------- usuário novo (sem perfil)
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
select is((select count(*)::int from public.members), 0, 'usuário sem perfil não vê dados');
select throws_ok(
  $$ insert into public.users (id, org_id, church_id, name, email, role)
     values ('00000000-0000-0000-0000-0000000000c1', 'org_a', 'ch_a', 'Hacker', 'novo@c.test', 'SUPER_ADMIN') $$,
  '42501', null, 'não cria o próprio perfil em org alheia nem como SUPER_ADMIN');
select is((select (public.onboard_organization('Org C', 'Igreja C', 'Novo')).role), 'ADMIN',
  'onboarding cria org, igreja e perfil ADMIN');
select is((select count(*)::int from public.churches c join public.users u on u.church_id = c.id
            where u.auth_user_id = '00000000-0000-0000-0000-0000000000c1'), 1, 'igreja do onboarding vinculada ao perfil');

-- ---------------------------------------------------------------- anônimo
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*)::int from public.church_events where church_id = 'ch_a'), 1, 'anônimo vê só evento público');
select throws_ok($$ select count(*) from public.churches $$, '42501', null, 'anônimo não lista igrejas');
select is((select name from public.get_public_church('ch_a')), 'Igreja A', 'anônimo lê a igreja pelo id');
select throws_ok($$ select count(*) from public.members $$, '42501', null, 'anônimo não lê membros');
select is((select (public.register_for_event('ev_pub', 'Maria Silva', '11988887777')).payment_status), 'FREE',
  'inscrição pública em evento gratuito');

select ok(public.submit_visitor_checkin('ch_a', 'Visitante Teste', '11977776666', prayer_request => 'Pela família') is not null,
  'check-in público de visitante');
reset role;
select is((select count(*)::int from public.prayer_requests where church_id = 'ch_a' and source = 'QR_CODE'), 1,
  'check-in com pedido gera pedido de oração');
select * from finish();
rollback;
