/**
 * Camada de dados sobre o Supabase com a mesma forma das chamadas que services/db.ts fazia ao
 * Firestore (collection/doc/query/where/getDoc/getDocs/setDoc/updateDoc/deleteDoc/onSnapshot).
 * Permite trocar o banco sem reescrever os ~80 métodos e os componentes de uma vez.
 *
 * Segurança: não há filtro de inquilino aqui por design. Quem decide o que cada usuário lê e grava
 * é o RLS do Postgres (supabase/migrations/*_rls.sql), com o JWT da sessão. Este módulo só:
 * - restringe tabelas e colunas às conhecidas (lib/db-columns.ts), descartando campos extras;
 * - converte tipos (Date ↔ ISO, '' → null em *_id, null → ausente);
 * - entrega tempo real via Realtime (que também respeita o RLS).
 */
import { supabase } from './supabase';
import { TABLE_COLUMNS, type TableName } from './db-columns';

// Tabelas são escolhidas em tempo de execução; os tipos gerados ficam para o código novo.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

type Row = Record<string, unknown>;
type Op = '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains';

interface Filter {
  field: string;
  op: Op;
  value: unknown;
}

export interface CollectionRef {
  kind: 'collection';
  table: TableName;
  filters: Filter[];
}

export interface DocRef {
  kind: 'doc';
  table: TableName;
  id: string;
}

/** Marcador mantido para as assinaturas antigas (`collection(db, ...)`). */
export const db = Object.freeze({ provider: 'supabase' as const });

// ---------------------------------------------------------------- erros
export type DataStoreErrorCode = 'permission-denied' | 'not-found' | 'already-exists' | 'invalid-argument' | 'unavailable' | 'unknown';

export class DataStoreError extends Error {
  constructor(message: string, readonly code: DataStoreErrorCode, readonly details?: unknown) {
    super(message);
    this.name = 'DataStoreError';
  }
}

function toError(err: { code?: string; message?: string; details?: string; hint?: string } | null, context: string): DataStoreError {
  const pgCode = err?.code || '';
  const code: DataStoreErrorCode =
    pgCode === '42501' || pgCode === 'PGRST301' || pgCode === '401' ? 'permission-denied'
    : pgCode === '23505' ? 'already-exists'
    : pgCode.startsWith('22') || pgCode.startsWith('23') ? 'invalid-argument'
    : pgCode === 'PGRST116' ? 'not-found'
    : /fetch|network|Failed to fetch/i.test(err?.message || '') ? 'unavailable'
    : 'unknown';
  return new DataStoreError(`${context}: ${err?.message || 'erro desconhecido'}`, code, err);
}

// ---------------------------------------------------------------- referências
function assertTable(name: string): TableName {
  if (!(name in TABLE_COLUMNS)) throw new DataStoreError(`Tabela desconhecida: ${name}`, 'invalid-argument');
  return name as TableName;
}

export const collection = (_db: unknown, table: string): CollectionRef => ({ kind: 'collection', table: assertTable(table), filters: [] });

export const doc = (_db: unknown, table: string, id: string): DocRef => {
  if (!id) throw new DataStoreError(`ID vazio em ${table}`, 'invalid-argument');
  return { kind: 'doc', table: assertTable(table), id };
};

export const where = (field: string, op: Op, value: unknown): Filter => ({ field, op, value });

export const query = (ref: CollectionRef, ...filters: Filter[]): CollectionRef => ({ ...ref, filters: [...ref.filters, ...filters] });

// ---------------------------------------------------------------- conversão
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function fromRow(row: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null) continue; // Firestore não tinha o campo; o app trata ausente
    out[key] = typeof value === 'string' && ISO_TIMESTAMP.test(value) ? new Date(value) : value;
  }
  return out;
}

function toRow(table: TableName, data: Row): Row {
  const allowed = TABLE_COLUMNS[table] as readonly string[];
  const out: Row = {};
  for (const [key, raw] of Object.entries(data)) {
    if (raw === undefined || !allowed.includes(key)) continue;
    let value: unknown = raw;
    if (value instanceof Date) value = isNaN(value.getTime()) ? null : value.toISOString();
    else if (value === '' && key !== 'id' && key.endsWith('_id')) value = null;
    out[key] = value;
  }
  return out;
}

// ---------------------------------------------------------------- snapshots
export class DocSnapshot {
  constructor(readonly id: string, private readonly row: Row | null) {}
  exists(): boolean {
    return this.row !== null;
  }
  /** Mesmo contrato do DocumentData do Firestore: o chamador decide o tipo. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data(): Record<string, any> {
    return this.row ? fromRow(this.row) : {};
  }
}

export interface QuerySnapshot {
  docs: DocSnapshot[];
  size: number;
  empty: boolean;
  forEach(fn: (d: DocSnapshot) => void): void;
}

function toQuerySnapshot(rows: Row[]): QuerySnapshot {
  const docs = rows.map((r) => new DocSnapshot(String(r.id), r));
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (fn) => docs.forEach(fn) };
}

// ---------------------------------------------------------------- leitura
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(builder: any, filters: Filter[]): any {
  let b = builder;
  for (const f of filters) {
    const v = f.value instanceof Date ? f.value.toISOString() : f.value;
    switch (f.op) {
      case '==': b = v === null ? b.is(f.field, null) : b.eq(f.field, v); break;
      case '!=': b = b.neq(f.field, v); break;
      case '<': b = b.lt(f.field, v); break;
      case '<=': b = b.lte(f.field, v); break;
      case '>': b = b.gt(f.field, v); break;
      case '>=': b = b.gte(f.field, v); break;
      case 'in': b = b.in(f.field, v as unknown[]); break;
      case 'array-contains': b = b.contains(f.field, [v]); break;
    }
  }
  return b;
}

const PAGE_SIZE = 1000; // limite padrão do PostgREST por requisição

async function fetchRows(ref: CollectionRef): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await applyFilters(sb.from(ref.table).select('*'), ref.filters)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw toError(error, `Leitura de ${ref.table}`);
    rows.push(...(data as Row[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

export async function getDoc(ref: DocRef): Promise<DocSnapshot> {
  const { data, error } = await sb.from(ref.table).select('*').eq('id', ref.id).maybeSingle();
  if (error) throw toError(error, `Leitura de ${ref.table}/${ref.id}`);
  return new DocSnapshot(ref.id, (data as Row) ?? null);
}

export async function getDocs(ref: CollectionRef): Promise<QuerySnapshot> {
  return toQuerySnapshot(await fetchRows(ref));
}

// ---------------------------------------------------------------- escrita
/**
 * Grava o registro inteiro. Tenta UPDATE primeiro e só faz INSERT se a linha não existir:
 * assim a edição do próprio perfil não passa pelas regras de criação (um upsert passaria).
 */
export async function setDoc(ref: DocRef, data: Row): Promise<void> {
  const row = toRow(ref.table, { ...data, id: ref.id });
  const { id: _id, ...changes } = row;

  if (Object.keys(changes).length > 0) {
    const { error, count } = await sb.from(ref.table).update(changes, { count: 'exact' }).eq('id', ref.id);
    if (error) throw toError(error, `Gravação de ${ref.table}/${ref.id}`);
    if (count && count > 0) return notifyLocalChange(ref.table);
  }

  const { error } = await sb.from(ref.table).insert(row);
  if (error) throw toError(error, `Criação de ${ref.table}/${ref.id}`);
  notifyLocalChange(ref.table);
}

export async function updateDoc(ref: DocRef, patch: Row): Promise<void> {
  const changes = toRow(ref.table, patch);
  delete changes.id;
  if (Object.keys(changes).length === 0) return;
  const { error, count } = await sb.from(ref.table).update(changes, { count: 'exact' }).eq('id', ref.id);
  if (error) throw toError(error, `Atualização de ${ref.table}/${ref.id}`);
  if (!count) throw new DataStoreError(`Registro não encontrado ou sem permissão: ${ref.table}/${ref.id}`, 'not-found');
  notifyLocalChange(ref.table);
}

export async function deleteDoc(ref: DocRef): Promise<void> {
  const { error } = await sb.from(ref.table).delete().eq('id', ref.id);
  if (error) throw toError(error, `Exclusão de ${ref.table}/${ref.id}`);
  notifyLocalChange(ref.table);
}

// ---------------------------------------------------------------- tempo real
// Escritas desta aba recarregam as assinaturas da mesma tabela na hora (sem esperar o Realtime).
const localListeners = new Map<TableName, Set<() => void>>();

function notifyLocalChange(table: TableName): void {
  localListeners.get(table)?.forEach((fn) => fn());
}

let channelSeq = 0;

// Exclusões chegam por Broadcast no canal privado "org:<org_id>" (RLS em realtime.messages: só
// membros da organização). Um canal por organização, compartilhado entre as assinaturas.
type DeleteListener = (table: string, id: string) => void;
const orgChannels = new Map<string, { channel: unknown; listeners: Set<DeleteListener> }>();

function listenOrgDeletes(orgId: string, listener: DeleteListener): () => void {
  let entry = orgChannels.get(orgId);
  if (!entry) {
    const listeners = new Set<DeleteListener>();
    const channel = sb
      .channel(`org:${orgId}`, { config: { private: true } })
      .on('broadcast', { event: 'row_deleted' }, (msg: { payload?: { table?: string; id?: string } }) => {
        const { table, id } = msg.payload || {};
        if (table && id) listeners.forEach((fn) => fn(table, id));
      })
      .subscribe();
    entry = { channel, listeners };
    orgChannels.set(orgId, entry);
  }
  entry.listeners.add(listener);
  return () => {
    const current = orgChannels.get(orgId);
    if (!current) return;
    current.listeners.delete(listener);
    if (current.listeners.size === 0) {
      orgChannels.delete(orgId);
      void sb.removeChannel(current.channel);
    }
  };
}

/**
 * Observa um registro ou uma consulta. Faz a leitura inicial e recarrega quando o Realtime avisa
 * mudança. A recarga é sempre uma consulta nova sob RLS: o evento só serve de gatilho, nunca como
 * fonte de dados.
 *
 * INSERT/UPDATE: postgres_changes (o Realtime aplica o RLS a cada assinante).
 * DELETE: não usa postgres_changes, que entregaria a chave apagada a assinantes de qualquer
 * organização; usa o canal privado da organização (ver listenOrgDeletes).
 */
export function onSnapshot(
  ref: DocRef | CollectionRef,
  onNext: ((snap: DocSnapshot) => void) & ((snap: QuerySnapshot) => void),
  onError?: (err: DataStoreError) => void,
): () => void {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let knownIds = new Set<string>();

  const report = (err: unknown) => {
    const e = err instanceof DataStoreError ? err : new DataStoreError(String(err), 'unknown', err);
    if (!onError) return console.error(e);
    try {
      onError(e);
    } catch (thrown) {
      console.error(thrown); // handlers antigos relançam o erro; não derrubar o app
    }
  };

  const load = async () => {
    try {
      if (ref.kind === 'doc') {
        const snap = await getDoc(ref);
        knownIds = new Set(snap.exists() ? [ref.id] : []);
        if (active) onNext(snap as never);
      } else {
        const snap = toQuerySnapshot(await fetchRows(ref));
        knownIds = new Set(snap.docs.map((d) => d.id));
        if (active) onNext(snap as never);
      }
    } catch (err) {
      if (active) report(err);
    }
  };

  const schedule = () => {
    if (!active) return;
    clearTimeout(timer);
    timer = setTimeout(load, 150);
  };

  const eqFilter =
    ref.kind === 'doc'
      ? `id=eq.${ref.id}`
      : (() => {
          const f = ref.filters.find((x) => x.op === '==' && ['string', 'number', 'boolean'].includes(typeof x.value));
          return f ? `${f.field}=eq.${String(f.value)}` : undefined;
        })();

  // Organização da assinatura (para o canal de exclusões).
  const orgId =
    ref.kind === 'doc'
      ? ref.table === 'organizations' ? ref.id : undefined
      : (ref.filters.find((f) => f.field === 'org_id' && f.op === '==')?.value as string | undefined);
  const stopDeletes = orgId
    ? listenOrgDeletes(orgId, (table, id) => {
        if (table === ref.table && knownIds.has(id)) schedule();
      })
    : () => {};

  let subscribedOnce = false;
  const channel = sb
    .channel(`ds:${ref.table}:${++channelSeq}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: ref.table, filter: eqFilter }, schedule)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: ref.table, filter: eqFilter }, schedule)
    .subscribe((status: string) => {
      // Reconexão: recarrega para não perder mudanças feitas enquanto o canal estava fora.
      if (status === 'SUBSCRIBED') {
        if (subscribedOnce) schedule();
        subscribedOnce = true;
      }
    });

  const listeners = localListeners.get(ref.table) ?? new Set();
  listeners.add(schedule);
  localListeners.set(ref.table, listeners);

  void load();

  return () => {
    active = false;
    clearTimeout(timer);
    listeners.delete(schedule);
    stopDeletes();
    void sb.removeChannel(channel);
  };
}

// ---------------------------------------------------------------- RPC
/** Chama uma função do banco (onboarding, fluxos públicos). */
export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw toError(error, `Função ${fn}`);
  return data as T;
}
