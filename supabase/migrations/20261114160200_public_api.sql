-- Koinonya: funções expostas ao app (RPC) e vínculo de login.
--
-- Fluxos públicos (sem login) não gravam direto nas tabelas: passam por estas funções, que validam
-- a entrada e definem os campos sensíveis no servidor (status, valores, códigos). Rate limit fica no
-- servidor Express/edge, não aqui.

-- ---------------------------------------------------------------- vínculo de perfil legado
-- Perfis importados do Firebase (ou criados pela equipe antes do primeiro login) são ligados ao
-- auth.users pelo e-mail, somente com e-mail confirmado (evita sequestro de perfil por cadastro).
create or replace function app.link_profile_on_auth() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null and new.email_confirmed_at is not null then
    update public.users u
       set auth_user_id = new.id
     where lower(u.email) = lower(new.email)
       and u.auth_user_id is null;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.link_profile_on_auth();
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users
  for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function app.link_profile_on_auth();

-- Vincula o login atual a um perfil existente com o mesmo e-mail (ex.: membro da equipe cadastrado
-- pelo admin depois que a pessoa já tinha conta). Só com e-mail confirmado. Retorna o perfil ou null.
create or replace function public.claim_profile() returns public.users
language plpgsql security definer set search_path = '' as $$
declare
  uid     uuid := (select auth.uid());
  au      auth.users;
  profile public.users;
begin
  if uid is null then
    raise exception 'Login necessário.' using errcode = '42501';
  end if;
  select * into profile from public.users where auth_user_id = uid;
  if found then
    return profile;
  end if;
  select * into au from auth.users where id = uid;
  if au.email is null or au.email_confirmed_at is null then
    return null;
  end if;
  update public.users u set auth_user_id = uid
   where lower(u.email) = lower(au.email) and u.auth_user_id is null
  returning * into profile;
  return profile;
end;
$$;

revoke all on function public.claim_profile() from public, anon;
grant execute on function public.claim_profile() to authenticated;

-- ---------------------------------------------------------------- dados públicos da igreja
-- Portal e check-in de visitante: uma igreja por id, só campos de contato. Sem listagem.
create or replace function public.get_public_church(church_id text)
returns table (id text, org_id text, name text, address text, city text, state text, phone text,
               email text, pastor_name text, logo_url text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.org_id, c.name, c.address, c.city, c.state, c.phone, c.email, c.pastor_name, c.logo_url
    from public.churches c
    join public.organizations o on o.id = c.org_id
   where c.id = get_public_church.church_id and o.active
$$;

revoke all on function public.get_public_church(text) from public;
grant execute on function public.get_public_church(text) to anon, authenticated;

-- ---------------------------------------------------------------- onboarding
-- Cria organização, igreja e perfil ADMIN para o usuário logado, numa transação.
create or replace function public.onboard_organization(
  org_name     text,
  church_name  text,
  user_name    text,
  plan         text default 'IGREJA',
  whatsapp     text default null
) returns public.users
language plpgsql security definer set search_path = '' as $$
declare
  uid        uuid := (select auth.uid());
  auth_email text;
  new_org    text := public.new_id();
  new_church text := public.new_id();
  profile    public.users;
begin
  if uid is null then
    raise exception 'Login necessário.' using errcode = '42501';
  end if;
  if exists (select 1 from public.users where auth_user_id = uid) then
    raise exception 'Usuário já possui organização.' using errcode = '23505';
  end if;
  if coalesce(trim(org_name), '') = '' or coalesce(trim(church_name), '') = '' or coalesce(trim(user_name), '') = '' then
    raise exception 'Nome da organização, da igreja e do responsável são obrigatórios.' using errcode = '22023';
  end if;
  if plan not in ('IGREJA', 'MULTI') then
    raise exception 'Plano inválido.' using errcode = '22023';
  end if;

  select email into auth_email from auth.users where id = uid;

  insert into public.organizations (id, name, plan, owner_id, owner_name, owner_email, owner_phone,
                                    active, lgpd_consent_version, subscription_status, trial_ends_at)
  values (new_org, trim(org_name), plan, uid::text, trim(user_name), auth_email, whatsapp,
          true, 'v1.0', 'TRIAL', now() + interval '14 days');

  insert into public.churches (id, org_id, name, pastor_name, email)
  values (new_church, new_org, trim(church_name), trim(user_name), coalesce(auth_email, ''));

  insert into public.users (id, auth_user_id, org_id, church_id, name, email, whatsapp, role, permissions, lgpd_consent_date)
  values (uid::text, uid, new_org, new_church, trim(user_name), auth_email, whatsapp, 'ADMIN', array['all'], now())
  returning * into profile;

  return profile;
end;
$$;

revoke all on function public.onboard_organization(text, text, text, text, text) from public, anon;
grant execute on function public.onboard_organization(text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------- check-in público de visitante
create or replace function public.submit_visitor_checkin(
  church_id     text,
  name          text,
  phone         text,
  email         text default null,
  gender        text default null,
  cep           text default null,
  address       text default null,
  neighborhood  text default null,
  city          text default null,
  how_met       text default null,
  prayer_request text default null,
  family_count  integer default null,
  family_notes  text default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  church    public.churches;
  member_id text := public.new_id();
  notes     text;
begin
  select c.* into church from public.churches c join public.organizations o on o.id = c.org_id
   where c.id = submit_visitor_checkin.church_id and o.active;
  if not found then
    raise exception 'Igreja não encontrada.' using errcode = 'P0002';
  end if;
  if char_length(trim(coalesce(name, ''))) not between 2 and 128 then
    raise exception 'Nome inválido.' using errcode = '22023';
  end if;
  if char_length(regexp_replace(coalesce(phone, ''), '\D', '', 'g')) not between 8 and 15 then
    raise exception 'Telefone inválido.' using errcode = '22023';
  end if;
  if char_length(coalesce(prayer_request, '')) > 2000 or char_length(coalesce(family_notes, '')) > 500 then
    raise exception 'Texto muito longo.' using errcode = '22023';
  end if;

  notes := concat_ws(E'\n\n',
    case when nullif(trim(prayer_request), '') is not null then '🙏 Pedido de Oração: ' || trim(prayer_request) end,
    case when nullif(trim(how_met), '') is not null then '📍 Como conheceu: ' || left(trim(how_met), 200) end,
    case when nullif(trim(neighborhood), '') is not null then '🏠 Bairro: ' || left(trim(neighborhood), 120) end,
    case when coalesce(family_count, 0) > 1
         then format('👨‍👩‍👧‍👦 Família presente: %s pessoas (%s)', least(family_count, 30), coalesce(trim(family_notes), '')) end
  );

  insert into public.members (id, org_id, church_id, name, phone, email, gender, cep, address, neighborhood, city,
                              stage, channel, engagement_score, notes, interests)
  values (member_id, church.org_id, church.id, trim(name), trim(phone), coalesce(trim(email), ''),
          left(gender, 20), left(cep, 9), left(address, 200), left(neighborhood, 120), left(city, 120),
          'NEW', 'QR_CODE', 50, nullif(notes, ''),
          case when nullif(trim(prayer_request), '') is not null then 'Oração' else 'Acolhimento' end);

  if nullif(trim(prayer_request), '') is not null then
    insert into public.prayer_requests (org_id, church_id, member_id, requester_name, requester_phone, category,
                                        urgency, privacy, request_text, status, prayer_count, source)
    values (church.org_id, church.id, member_id, trim(name), left(trim(phone), 32), 'OTHER',
            'NORMAL', 'LEADERS_ONLY', left(trim(prayer_request), 2000), 'RECEIVED', 0, 'QR_CODE');
  end if;

  return member_id;
end;
$$;

-- ---------------------------------------------------------------- pedido de oração público
create or replace function public.submit_prayer_request(
  church_id       text,
  requester_name  text,
  request_text    text,
  category        text default 'OTHER',
  requester_phone text default null,
  urgency         text default 'NORMAL',
  privacy         text default 'LEADERS_ONLY'
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  church public.churches;
  new_id text := public.new_id();
begin
  select c.* into church from public.churches c join public.organizations o on o.id = c.org_id
   where c.id = submit_prayer_request.church_id and o.active;
  if not found then
    raise exception 'Igreja não encontrada.' using errcode = 'P0002';
  end if;
  if char_length(trim(coalesce(requester_name, ''))) not between 2 and 128
     or char_length(trim(coalesce(request_text, ''))) not between 3 and 2000 then
    raise exception 'Nome ou pedido inválido.' using errcode = '22023';
  end if;

  insert into public.prayer_requests (id, org_id, church_id, requester_name, requester_phone, category, urgency,
                                      privacy, request_text, status, prayer_count, source)
  values (new_id, church.org_id, church.id, trim(requester_name), left(trim(requester_phone), 32), category, urgency,
          privacy, trim(request_text), 'RECEIVED', 0, 'QR_CODE');
  return new_id;
end;
$$;

-- ---------------------------------------------------------------- inscrição pública em evento
create or replace function public.register_for_event(
  event_id          text,
  participant_name  text,
  participant_phone text,
  participant_email text default null,
  notes             text default null
) returns public.event_registrations
language plpgsql security definer set search_path = '' as $$
declare
  ev       public.church_events;
  taken    integer;
  reg      public.event_registrations;
  is_free  boolean;
begin
  -- Trava a linha do evento: duas inscrições simultâneas não estouram a capacidade.
  select * into ev from public.church_events e where e.id = register_for_event.event_id for update;
  if not found or not ev.allow_public_registration or not ev.active or ev.status <> 'OPEN' then
    raise exception 'Evento não está aberto para inscrições.' using errcode = 'P0002';
  end if;

  if ev.capacity > 0 then
    select count(*) into taken from public.event_registrations r
     where r.event_id = ev.id and r.status <> 'CANCELED';
    if taken >= ev.capacity then
      raise exception 'Vagas esgotadas.' using errcode = 'P0001';
    end if;
  end if;

  is_free := ev.registration_fee <= 0;

  insert into public.event_registrations (org_id, church_id, event_id, event_title, participant_name, participant_phone,
                                          participant_email, ticket_code, payment_status, amount_paid, status, source, notes)
  values (ev.org_id, ev.church_id, ev.id, ev.title, trim(participant_name), trim(participant_phone),
          nullif(trim(coalesce(participant_email, '')), ''),
          'KNY-' || upper(substr(md5(extensions.gen_random_uuid()::text), 1, 4)) || '-' || to_char(clock_timestamp(), 'MSUS'),
          case when is_free then 'FREE' else 'PENDING' end,
          case when is_free then 0 else ev.registration_fee end,
          'CONFIRMED', 'PUBLIC_PORTAL', left(trim(notes), 500))
  returning * into reg;

  if ev.capacity > 0 and taken + 1 >= ev.capacity then
    update public.church_events set status = 'FULL' where id = ev.id;
  end if;

  return reg;
end;
$$;

revoke all on function public.submit_visitor_checkin(text, text, text, text, text, text, text, text, text, text, text, integer, text) from public;
revoke all on function public.submit_prayer_request(text, text, text, text, text, text, text) from public;
revoke all on function public.register_for_event(text, text, text, text, text) from public;
grant execute on function public.submit_visitor_checkin(text, text, text, text, text, text, text, text, text, text, text, integer, text) to anon, authenticated;
grant execute on function public.submit_prayer_request(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.register_for_event(text, text, text, text, text) to anon, authenticated;
