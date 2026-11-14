-- Koinonya: tempo real isolado por organização.
--
-- INSERT/UPDATE chegam pelo postgres_changes, que aplica o RLS a cada assinante.
-- DELETE não: o Postgres só tem a chave da linha apagada e o Realtime entrega o evento a todos que
-- assinam a tabela, de qualquer organização. Por isso exclusões são avisadas por Broadcast num canal
-- privado "org:<org_id>", e o RLS de realtime.messages só deixa membros da organização ouvirem.

create or replace function app.broadcast_row_deleted() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  target_org text := case when tg_table_name = 'organizations' then old.id else old.org_id end;
begin
  if target_org is not null then
    perform realtime.send(
      jsonb_build_object('table', tg_table_name, 'id', old.id),
      'row_deleted',
      'org:' || target_org,
      true -- canal privado
    );
  end if;
  return old;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations', 'churches', 'users', 'members', 'events', 'cells', 'cell_meetings', 'automation_rules',
    'financial_campaigns', 'financial_transactions', 'discipleship_tracks', 'member_track_progress',
    'broadcast_campaigns', 'message_logs', 'ministries', 'ministry_schedules', 'service_checkins',
    'prayer_requests', 'pastoral_visits', 'saas_invoices', 'church_events', 'event_registrations'
  ]
  loop
    execute format(
      'create trigger %1$s_broadcast_delete after delete on public.%1$I for each row execute function app.broadcast_row_deleted()',
      t);
  end loop;
end;
$$;

-- Só membros da organização recebem as mensagens do canal "org:<org_id>". Ninguém publica pelo
-- cliente: as mensagens vêm só do trigger acima.
create policy org_members_receive_broadcast on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime.topic() like 'org:%'
    and app.is_member(substr(realtime.topic(), 5))
  );
