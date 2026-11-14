/**
 * Gera lib/db-columns.ts a partir do Supabase local: colunas graváveis de cada tabela do app.
 * O adaptador de dados usa a lista para nunca enviar campos desconhecidos (ex.: `password` do
 * formulário de equipe) nem colunas controladas pelo sistema (auth_user_id).
 *
 * Uso: pnpm gen:columns   (rodado também por `pnpm db:types` na raiz)
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', '..', 'lib', 'db-columns.ts');
const DB_URL = process.env.LOCAL_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/** Colunas que o cliente nunca grava (definidas por funções do banco). */
const SYSTEM_COLUMNS: Record<string, string[]> = {
  users: ['auth_user_id'],
};

const client = new pg.Client({ connectionString: DB_URL });
await client.connect();
const { rows } = await client.query<{ table_name: string; column_name: string }>(`
  select c.table_name, c.column_name
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
   where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
   order by c.table_name, c.ordinal_position`);
await client.end();

const tables = new Map<string, string[]>();
for (const r of rows) {
  if (SYSTEM_COLUMNS[r.table_name]?.includes(r.column_name)) continue;
  if (!tables.has(r.table_name)) tables.set(r.table_name, []);
  tables.get(r.table_name)!.push(r.column_name);
}

const body = [...tables.entries()]
  .map(([t, cols]) => `  ${t}: [${cols.map((c) => `'${c}'`).join(', ')}],`)
  .join('\n');

await writeFile(
  OUT,
  `// Gerado por scripts/firebase-capture/gen-db-columns.ts. Não editar à mão: rode \`pnpm db:types\`.
export const TABLE_COLUMNS = {
${body}
} as const;

export type TableName = keyof typeof TABLE_COLUMNS;
`,
);
console.log(`${OUT}: ${tables.size} tabelas`);
