/**
 * Importa uma captura do Firestore (exports/firebase/<captura>/firestore/data/*.ndjson) no Postgres
 * do Supabase LOCAL, para validar o esquema com dados reais.
 *
 * - Converte tipos codificados pela captura (timestamp, ref, redacted…).
 * - Grava só colunas que existem na tabela; campos desconhecidos são listados no relatório.
 * - Tudo numa transação: qualquer violação de constraint aborta e mostra o documento.
 * - Recusa banco que não seja localhost (use --allow-remote conscientemente).
 *
 * Uso:
 *   pnpm import:local [--capture <dir>] [--reset] [--db <postgres-url>]
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name: string): boolean => args.includes(name);

const DB_URL = opt('--db') || process.env.LOCAL_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const RESET = flag('--reset');

/** Ordem respeita as FKs. */
const TABLES = [
  'organizations', 'churches', 'users', 'cells', 'members', 'events', 'cell_meetings', 'automation_rules',
  'financial_campaigns', 'financial_transactions', 'discipleship_tracks', 'member_track_progress',
  'broadcast_campaigns', 'message_logs', 'ministries', 'ministry_schedules', 'service_checkins',
  'prayer_requests', 'pastoral_visits', 'saas_invoices', 'church_events', 'event_registrations',
] as const;

type Encoded = null | boolean | number | string | Encoded[] | { [k: string]: Encoded };

interface ColumnInfo {
  name: string;
  dataType: string; // information_schema.columns.data_type
}

async function latestCapture(): Promise<string> {
  const base = path.join(ROOT, 'exports', 'firebase');
  const dirs = (await readdir(base, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  if (!dirs.length) throw new Error(`Nenhuma captura em ${base}`);
  return path.join(base, dirs[dirs.length - 1]);
}

/** Desfaz a codificação da captura. `undefined` = campo descartado. */
function decode(value: Encoded): unknown {
  if (Array.isArray(value)) return value.map(decode).filter((v) => v !== undefined);
  if (value && typeof value === 'object') {
    const t = (value as { __type?: string }).__type;
    if (t === 'timestamp') return (value as { iso: string }).iso;
    if (t === 'ref') return String((value as { path: string }).path).split('/').pop();
    if (t === 'geopoint') return { lat: (value as { lat: number }).lat, lng: (value as { lng: number }).lng };
    if (t === 'bytes') return (value as { base64: string }).base64;
    if (t === 'number') return Number((value as { value: string }).value);
    if (t === 'redacted') return undefined;
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const d = decode(v);
      if (d !== undefined) o[k] = d;
    }
    return o;
  }
  return value;
}

function toColumn(value: unknown, col: ColumnInfo): unknown {
  if (value === null || value === undefined) return null;
  // O app usa '' como "sem vínculo" (ex.: cell_id); no Postgres isso é null (senão quebra a FK).
  if (value === '' && col.name !== 'id' && col.name.endsWith('_id')) return null;
  if (col.dataType === 'jsonb' || col.dataType === 'json') return JSON.stringify(value);
  if (col.dataType === 'ARRAY') return Array.isArray(value) ? value.map((v) => (v === null ? null : String(v))) : [String(value)];
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  return value;
}

async function main(): Promise<void> {
  const host = new URL(DB_URL).hostname;
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) && !flag('--allow-remote')) {
    throw new Error(`Banco ${host} não é local. Este script é para o Supabase local.`);
  }

  const capture = path.resolve(opt('--capture') || (await latestCapture()));
  const dataDir = path.join(capture, 'firestore', 'data');
  console.log(`Captura: ${capture}`);
  console.log(`Banco:   ${DB_URL.replace(/:[^:@/]+@/, ':***@')}\n`);

  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();

  const report: Record<string, { rows: number; droppedFields: string[] }> = {};
  try {
    await client.query('begin');
    if (RESET) {
      await client.query('truncate public.organizations cascade');
      console.log('Tabelas limpas (truncate organizations cascade).');
    }

    for (const table of TABLES) {
      const file = path.join(dataDir, `${table}.ndjson`);
      if (!existsSync(file)) continue;

      const { rows: colRows } = await client.query<{ column_name: string; data_type: string }>(
        `select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = $1`,
        [table],
      );
      const columns = new Map<string, ColumnInfo>(colRows.map((c) => [c.column_name, { name: c.column_name, dataType: c.data_type }]));
      const dropped = new Set<string>();
      let count = 0;

      const lines = (await readFile(file, 'utf8')).split('\n').filter(Boolean);
      for (const line of lines) {
        const docRaw = JSON.parse(line) as { id: string; phantom?: boolean; data?: Record<string, Encoded> };
        if (docRaw.phantom || !docRaw.data) continue;
        const data = decode(docRaw.data) as Record<string, unknown>;
        data.id = docRaw.id; // o ID do documento é a fonte de verdade

        const names: string[] = [];
        const values: unknown[] = [];
        for (const [key, value] of Object.entries(data)) {
          const col = columns.get(key);
          if (!col) {
            dropped.add(key);
            continue;
          }
          names.push(`"${key}"`);
          values.push(toColumn(value, col));
        }

        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const updates = names.filter((n) => n !== '"id"').map((n) => `${n} = excluded.${n}`).join(', ');
        const sql = `insert into public.${table} (${names.join(', ')}) values (${placeholders})
                     on conflict (id) do ${updates ? `update set ${updates}` : 'nothing'}`;
        await client.query('savepoint doc');
        try {
          await client.query(sql, values);
          await client.query('release savepoint doc');
        } catch (err) {
          await client.query('rollback to savepoint doc');
          const e = err as { message?: string; detail?: string; constraint?: string };
          throw new Error(`${table}/${docRaw.id}: ${e.message}${e.detail ? ` (${e.detail})` : ''}`);
        }
        count += 1;
      }
      report[table] = { rows: count, droppedFields: [...dropped].sort() };
      console.log(`${table.padEnd(24)} ${String(count).padStart(4)} linha(s)${dropped.size ? `  · campos ignorados: ${[...dropped].join(', ')}` : ''}`);
    }

    await client.query('commit');
    console.log('\nImportação concluída.');
  } catch (err) {
    await client.query('rollback');
    console.error(`\nFALHOU (nada foi gravado): ${(err as Error).message}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

await main();
