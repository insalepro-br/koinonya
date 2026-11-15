/**
 * Teste de isolamento entre organizações pelo mesmo caminho do app: supabase-js com a chave
 * publicável, API REST (PostgREST) e Realtime, contra o Supabase LOCAL.
 *
 * Cria dois usuários em organizações diferentes e confirma que um não lê, não altera, não apaga
 * e não recebe em tempo real nada do outro. Também confere o acesso anônimo.
 *
 * Uso: pnpm test:isolation   (requer `pnpm db:start`)
 */
import { execSync } from 'node:child_process';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const status = JSON.parse(
  execSync('pnpm exec supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/^[^{]*/, ''),
) as { API_URL: string; PUBLISHABLE_KEY: string; SECRET_KEY: string };

const URL_ = status.API_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(URL_)) throw new Error('Somente Supabase local.');

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? 'ok  ' : 'FALHOU'}  ${label}`);
  if (!ok) failures += 1;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const newClient = () => createClient(URL_, status.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const admin = createClient(URL_, status.SECRET_KEY, { auth: { persistSession: false } });
const stamp = Date.now();

async function makeTenant(label: string): Promise<{ client: SupabaseClient; orgId: string; churchId: string; userId: string }> {
  const email = `${label}-${stamp}@isolamento.test`;
  const password = `Senha-${stamp}-${label}`;
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = newClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  const { data: profile, error: onboardError } = await client.rpc('onboard_organization', {
    org_name: `Org ${label}`,
    church_name: `Igreja ${label}`,
    user_name: `Admin ${label}`,
  });
  if (onboardError) throw onboardError;
  return { client, orgId: profile.org_id, churchId: profile.church_id, userId: created.user!.id };
}

async function main() {
  const a = await makeTenant('a');
  const b = await makeTenant('b');
  await a.client.realtime.setAuth((await a.client.auth.getSession()).data.session!.access_token);
  await b.client.realtime.setAuth((await b.client.auth.getSession()).data.session!.access_token);

  // ---------------------------------------------------------------- tempo real
  const seenByA: string[] = [];
  const seenByB: string[] = [];
  const deletesSeenByA: string[] = [];
  const deletesSeenByB: string[] = [];

  const subscribe = (client: SupabaseClient, name: string, onRow: (id: string) => void) =>
    new Promise<void>((resolve) => {
      client
        .channel(`t-${name}-${stamp}`)
        // Sem filtro de propósito: o RLS precisa bloquear sozinho.
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'members' }, (p) => onRow(String((p.new as { id: string }).id)))
        .subscribe((s) => s === 'SUBSCRIBED' && resolve());
    });
  const subscribeOrg = (client: SupabaseClient, orgId: string, sink: string[]) =>
    new Promise<string>((resolve) => {
      client
        .channel(`org:${orgId}`, { config: { private: true } })
        .on('broadcast', { event: 'row_deleted' }, (m) => sink.push(String(m.payload?.id)))
        .subscribe((s) => (s === 'SUBSCRIBED' || s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') && resolve(s));
    });

  await subscribe(a.client, 'a', (id) => seenByA.push(id));
  await subscribe(b.client, 'b', (id) => seenByB.push(id));
  const aOwnChannel = await subscribeOrg(a.client, a.orgId, deletesSeenByA);
  const bSpyChannel = await subscribeOrg(b.client, a.orgId, deletesSeenByB); // B tenta ouvir o canal de A
  check(aOwnChannel === 'SUBSCRIBED', 'A assina o canal privado da própria organização');
  check(bSpyChannel !== 'SUBSCRIBED', `B não consegue assinar o canal privado da organização A (${bSpyChannel})`);

  // ---------------------------------------------------------------- escrita de A
  const memberId = `iso-${stamp}`;
  const { error: insertError } = await a.client.from('members').insert({ id: memberId, org_id: a.orgId, church_id: a.churchId, name: 'Pessoa de A' });
  check(!insertError, 'A cria membro na própria organização');
  await sleep(2500);
  check(seenByA.includes(memberId), 'A recebe o próprio INSERT em tempo real');
  check(!seenByB.includes(memberId), 'B não recebe em tempo real o INSERT da organização A');

  // ---------------------------------------------------------------- B contra os dados de A
  const { data: bRead } = await b.client.from('members').select('id').eq('id', memberId);
  check((bRead ?? []).length === 0, 'B não lê o membro de A por ID');
  const { data: bList } = await b.client.from('members').select('org_id');
  check((bList ?? []).every((r) => r.org_id === b.orgId), 'B só lista membros da própria organização');
  const { count: bUpdated } = await b.client.from('members').update({ name: 'Hackeado' }, { count: 'exact' }).eq('id', memberId);
  check(!bUpdated, 'B não altera o membro de A');
  const { count: bDeleted } = await b.client.from('members').delete({ count: 'exact' }).eq('id', memberId);
  check(!bDeleted, 'B não apaga o membro de A');
  const { error: bInsertIntoA } = await b.client.from('members').insert({ org_id: a.orgId, church_id: a.churchId, name: 'Infiltrado' });
  check(!!bInsertIntoA, 'B não cria membro dentro da organização A');
  const { data: bOrgs } = await b.client.from('organizations').select('id');
  check((bOrgs ?? []).every((o) => o.id === b.orgId), 'B só enxerga a própria organização');
  const { data: bChurches } = await b.client.from('churches').select('id');
  check((bChurches ?? []).every((c) => c.id === b.churchId), 'B só enxerga a própria igreja');
  const { data: bUsers } = await b.client.from('users').select('org_id');
  check((bUsers ?? []).every((u) => u.org_id === b.orgId), 'B só enxerga a própria equipe');
  const { error: bSelfPromote } = await b.client.from('users').update({ role: 'SUPER_ADMIN' }).eq('auth_user_id', b.userId);
  check(!!bSelfPromote, 'B não se promove a SUPER_ADMIN');
  const { error: bOnboardAgain } = await b.client.rpc('onboard_organization', { org_name: 'X', church_name: 'Y', user_name: 'Z' });
  check(!!bOnboardAgain, 'B não cria segunda organização para trocar de inquilino');

  // ---------------------------------------------------------------- exclusão em tempo real
  const { error: aDelete } = await a.client.from('members').delete().eq('id', memberId);
  check(!aDelete, 'A apaga o próprio membro');
  await sleep(2500);
  check(deletesSeenByA.includes(memberId), 'A recebe aviso de exclusão no canal privado');
  check(!deletesSeenByB.includes(memberId), 'B não recebe aviso de exclusão da organização A');

  // ---------------------------------------------------------------- anônimo
  const anon = newClient();
  const { error: anonMembers } = await anon.from('members').select('id').limit(1);
  check(!!anonMembers, 'anônimo não lê membros');
  const { error: anonChurches } = await anon.from('churches').select('id').limit(1);
  check(!!anonChurches, 'anônimo não lista igrejas');
  const { data: publicChurch } = await anon.rpc('get_public_church', { church_id: a.churchId });
  check(Array.isArray(publicChurch) && publicChurch.length === 1, 'anônimo lê a igreja pelo ID (portal)');

  // ---------------------------------------------------------------- limpeza
  await a.client.removeAllChannels();
  await b.client.removeAllChannels();
  for (const t of [a, b]) {
    await admin.from('organizations').delete().eq('id', t.orgId);
    await admin.auth.admin.deleteUser(t.userId);
  }

  console.log(failures ? `\n${failures} falha(s).` : '\nIsolamento confirmado.');
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
