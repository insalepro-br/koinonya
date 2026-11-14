#!/usr/bin/env node
/**
 * Captura SOMENTE LEITURA do Firebase legado (projeto do AI Studio).
 *
 * Gera em OUT_DIR:
 *   firestore/data/<caminho>.ndjson   documentos com tipos preservados (timestamp, ref, geopoint, bytes)
 *   firestore/schema.json             esquema inferido: campos, tipos, frequência, por coleção
 *   firestore/schema.md               mesmo esquema em tabela legível
 *   firestore/database.json           configuração do banco (local, tipo, PITR…)
 *   firestore/indexes.json            índices compostos
 *   firestore/field-overrides.json    exceções de índice e TTL
 *   rules/firestore.rules             regras PUBLICADAS para o banco nomeado
 *   rules/storage.rules               regras publicadas do Storage (se houver)
 *   rules/diff-vs-repo.txt            igual/diferente do firestore.rules do repositório
 *   auth/users.ndjson                 usuários (sem hash de senha)
 *   auth/config.json                  provedores, domínios autorizados, templates
 *   storage/objects.ndjson            lista de objetos do bucket
 *   manifest.json                     contagens, erros por seção, sha256 de cada arquivo
 *
 * Credenciais: Application Default Credentials.
 *   - gcloud auth application-default login   (conta Google dona do projeto)
 *   - ou GOOGLE_APPLICATION_CREDENTIALS=<chave da service account>.json
 *
 * Uso:
 *   node capture.mjs [--download-storage] [--out <dir>]
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, readdir, stat } from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp, GeoPoint, DocumentReference } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { GoogleAuth } from 'google-auth-library';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// ---------- configuração ----------
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const legacyConfigPath = path.join(REPO_ROOT, 'firebase-applet-config.json');
const legacyConfig = existsSync(legacyConfigPath)
  ? JSON.parse(await readFile(legacyConfigPath, 'utf8'))
  : {};

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || legacyConfig.projectId;
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || legacyConfig.firestoreDatabaseId || '(default)';
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || legacyConfig.storageBucket;
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.resolve(opt('--out') || path.join(REPO_ROOT, 'exports', 'firebase', STAMP));
const DOWNLOAD_STORAGE = flag('--download-storage');
const BATCH = 300;

if (!PROJECT_ID) {
  console.error('FIREBASE_PROJECT_ID ausente e firebase-applet-config.json não encontrado.');
  process.exit(1);
}

console.log(`Projeto: ${PROJECT_ID}`);
console.log(`Banco:   ${DATABASE_ID}`);
console.log(`Bucket:  ${BUCKET || '(nenhum)'}`);
console.log(`Saída:   ${OUT_DIR}\n`);

const app = initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID, storageBucket: BUCKET });
const db = getFirestore(app, DATABASE_ID);
const gauth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

const manifest = {
  captured_at: new Date().toISOString(),
  project_id: PROJECT_ID,
  database_id: DATABASE_ID,
  storage_bucket: BUCKET || null,
  mode: 'read-only',
  sections: {},
  counts: {},
  files: {},
};

// ---------- utilidades ----------
async function out(rel, content) {
  const full = path.join(OUT_DIR, rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  return full;
}

async function googleApi(url, extraHeaders = {}) {
  const client = await gauth.getClient();
  const res = await client.request({
    url,
    headers: { 'x-goog-user-project': PROJECT_ID, ...extraHeaders },
  });
  return res.data;
}

async function section(name, fn) {
  process.stdout.write(`→ ${name}… `);
  try {
    const info = await fn();
    manifest.sections[name] = { ok: true, ...(info || {}) };
    console.log('ok');
  } catch (err) {
    const message = err?.response?.data?.error?.message || err?.message || String(err);
    manifest.sections[name] = { ok: false, error: message };
    console.log(`FALHOU: ${message}`);
  }
}

/** Codifica valores do Firestore em JSON preservando o tipo. */
function encode(value) {
  if (value === null || value === undefined) return value ?? null;
  if (value instanceof Timestamp) {
    return { __type: 'timestamp', iso: value.toDate().toISOString(), seconds: value.seconds, nanos: value.nanoseconds };
  }
  if (value instanceof GeoPoint) return { __type: 'geopoint', lat: value.latitude, lng: value.longitude };
  if (value instanceof DocumentReference) return { __type: 'ref', path: value.path };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return { __type: 'bytes', base64: Buffer.from(value).toString('base64') };
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return { __type: 'number', value: String(value) };
  if (Array.isArray(value)) return value.map(encode);
  if (typeof value === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(value)) o[k] = encode(v);
    return o;
  }
  return value;
}

function typeOf(value) {
  if (value === null || value === undefined) return 'null';
  if (value instanceof Timestamp) return 'timestamp';
  if (value instanceof GeoPoint) return 'geopoint';
  if (value instanceof DocumentReference) return 'reference';
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return 'bytes';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'double';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return 'string(iso-datetime)';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'string(date)';
    if (/^data:[^;]+;base64,/.test(value)) return 'string(data-uri)';
    if (/^https?:\/\//.test(value)) return 'string(url)';
    return 'string';
  }
  return typeof value; // boolean | object(map)
}

// ---------- inferência de esquema ----------
/** schema[collectionPattern] = { docs, fields: { path: { types: {t:n}, present, maxLen, sample } } } */
const schema = {};

function collectionPattern(collPath) {
  // users/abc/notes -> users/{id}/notes
  return collPath.split('/').map((seg, i) => (i % 2 === 1 ? '{id}' : seg)).join('/');
}

function observe(pattern, data) {
  const entry = (schema[pattern] ||= { docs: 0, fields: {} });
  entry.docs += 1;
  const walk = (obj, prefix) => {
    for (const [k, v] of Object.entries(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      const f = (entry.fields[p] ||= { types: {}, present: 0, maxLen: 0, enumValues: {} });
      const t = typeOf(v);
      f.types[t] = (f.types[t] || 0) + 1;
      f.present += 1;
      if (typeof v === 'string') {
        f.maxLen = Math.max(f.maxLen, v.length);
        // candidatos a enum: strings curtas e sem espaço repetidas
        if (v.length <= 40 && f.enumValues && Object.keys(f.enumValues).length <= 25) {
          f.enumValues[v] = (f.enumValues[v] || 0) + 1;
        } else {
          f.enumValues = null;
        }
      } else if (f.enumValues && t !== 'null') {
        f.enumValues = null;
      }
      if (t === 'object') walk(v, p);
      if (t === 'array') {
        const elemKey = `${p}[]`;
        const ef = (entry.fields[elemKey] ||= { types: {}, present: 0, maxLen: 0, enumValues: null });
        ef.present += 1;
        for (const el of v) {
          const et = typeOf(el);
          ef.types[et] = (ef.types[et] || 0) + 1;
          if (et === 'object') walk(el, elemKey);
        }
      }
    }
  };
  walk(data, '');
}

function finalizeSchema() {
  for (const entry of Object.values(schema)) {
    for (const f of Object.values(entry.fields)) {
      f.optional = f.present < entry.docs;
      if (f.enumValues) {
        const vals = Object.keys(f.enumValues);
        // só mantém se parece enum de verdade (poucos valores distintos, repetidos)
        f.enumValues = vals.length > 0 && vals.length <= 20 && f.present >= vals.length * 2 ? vals.sort() : null;
      }
      if (!f.enumValues) delete f.enumValues;
    }
  }
}

function schemaMarkdown() {
  const lines = [`# Esquema observado do Firestore`, '', `Projeto \`${PROJECT_ID}\`, banco \`${DATABASE_ID}\`, capturado em ${manifest.captured_at}.`, ''];
  for (const [pattern, entry] of Object.entries(schema).sort()) {
    lines.push(`## \`${pattern}\` — ${entry.docs} documento(s)`, '', '| Campo | Tipos (ocorrências) | Opcional | Máx. chars | Valores (enum?) |', '| --- | --- | --- | --- | --- |');
    for (const [p, f] of Object.entries(entry.fields).sort()) {
      const types = Object.entries(f.types).map(([t, n]) => `${t} (${n})`).join(', ');
      const en = f.enumValues ? f.enumValues.map((v) => `\`${v}\``).join(' ') : '';
      lines.push(`| \`${p}\` | ${types} | ${f.optional ? 'sim' : ''} | ${f.maxLen || ''} | ${en} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ---------- Firestore: dados ----------
async function dumpCollection(collRef, counts) {
  const pattern = collectionPattern(collRef.path);
  const file = path.join(OUT_DIR, 'firestore', 'data', `${collRef.path.replace(/\//g, '__')}.ndjson`);
  await mkdir(path.dirname(file), { recursive: true });
  const stream = createWriteStream(file);

  // listDocuments inclui documentos "fantasma" (sem campos, só com subcoleções)
  const refs = await collRef.listDocuments();
  let written = 0;
  let phantoms = 0;
  for (let i = 0; i < refs.length; i += BATCH) {
    const chunk = refs.slice(i, i + BATCH);
    const snaps = await db.getAll(...chunk);
    for (const snap of snaps) {
      if (snap.exists) {
        const data = snap.data();
        observe(pattern, data);
        stream.write(JSON.stringify({
          path: snap.ref.path,
          id: snap.id,
          create_time: snap.createTime?.toDate().toISOString() ?? null,
          update_time: snap.updateTime?.toDate().toISOString() ?? null,
          data: encode(data),
        }) + '\n');
        written += 1;
      } else {
        phantoms += 1;
        stream.write(JSON.stringify({ path: snap.ref.path, id: snap.id, phantom: true }) + '\n');
      }
    }
  }
  await new Promise((r) => stream.end(r));
  counts[collRef.path] = { documents: written, phantom_documents: phantoms };

  // subcoleções
  for (const ref of refs) {
    const subs = await ref.listCollections();
    for (const sub of subs) await dumpCollection(sub, counts);
  }
}

// ---------- execução ----------
try {
  const client = await gauth.getClient();
  await client.getAccessToken();
  const who = client.email || (await gauth.getCredentials().catch(() => ({}))).client_email || 'conta do gcloud';
  console.log(`Credencial: ${who}\n`);
} catch (err) {
  console.error('Sem credenciais Google. Faça UMA das opções:');
  console.error('  1) gcloud auth application-default login');
  console.error('  2) set GOOGLE_APPLICATION_CREDENTIALS=C:\\caminho\\fora-do-repo\\service-account.json');
  console.error(`Detalhe: ${err?.message}`);
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

await section('firestore.database', async () => {
  const data = await googleApi(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE_ID)}`);
  await out('firestore/database.json', data);
  return { location: data.locationId, type: data.type };
});

await section('firestore.data', async () => {
  const counts = {};
  const roots = await db.listCollections();
  for (const coll of roots) {
    process.stdout.write(`\n   ${coll.id}`);
    await dumpCollection(coll, counts);
  }
  process.stdout.write('\n   ');
  manifest.counts.firestore = counts;
  finalizeSchema();
  await out('firestore/schema.json', schema);
  await out('firestore/schema.md', schemaMarkdown());
  return { root_collections: roots.map((c) => c.id), collections_total: Object.keys(counts).length };
});

await section('firestore.indexes', async () => {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${encodeURIComponent(DATABASE_ID)}/collectionGroups/-`;
  const indexes = [];
  let pageToken;
  do {
    const data = await googleApi(`${base}/indexes${pageToken ? `?pageToken=${pageToken}` : ''}`);
    indexes.push(...(data.indexes || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  await out('firestore/indexes.json', indexes);

  const fields = [];
  pageToken = undefined;
  do {
    const q = new URLSearchParams({ filter: 'indexConfig.usesAncestorConfig:false OR ttlConfig:*' });
    if (pageToken) q.set('pageToken', pageToken);
    const data = await googleApi(`${base}/fields?${q}`);
    fields.push(...(data.fields || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  await out('firestore/field-overrides.json', fields);
  manifest.counts.indexes = indexes.length;
  return { composite_indexes: indexes.length, field_overrides: fields.length };
});

await section('rules', async () => {
  const releases = [];
  let pageToken;
  do {
    const data = await googleApi(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases${pageToken ? `?pageToken=${pageToken}` : ''}`);
    releases.push(...(data.releases || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  await out('rules/releases.json', releases);

  const fsReleaseName = DATABASE_ID === '(default)'
    ? `projects/${PROJECT_ID}/releases/cloud.firestore`
    : `projects/${PROJECT_ID}/releases/cloud.firestore/${DATABASE_ID}`;
  const found = {};
  for (const rel of releases) {
    const ruleset = await googleApi(`https://firebaserules.googleapis.com/v1/${rel.rulesetName}`);
    const source = (ruleset.source?.files || []).map((f) => f.content).join('\n');
    if (rel.name === fsReleaseName) {
      await out('rules/firestore.rules', source);
      found.firestore = rel.updateTime;
      const local = existsSync(path.join(REPO_ROOT, 'firestore.rules'))
        ? await readFile(path.join(REPO_ROOT, 'firestore.rules'), 'utf8')
        : null;
      const norm = (s) => s.replace(/\r\n/g, '\n').trim();
      await out('rules/diff-vs-repo.txt', local === null
        ? 'firestore.rules ausente no repositório'
        : norm(local) === norm(source)
          ? 'IGUAL: regras publicadas == firestore.rules do repositório'
          : 'DIFERENTE: regras publicadas divergem do firestore.rules do repositório. Compare rules/firestore.rules.');
    } else if (rel.name.includes('/releases/firebase.storage/')) {
      await out('rules/storage.rules', source);
      found.storage = rel.updateTime;
    } else {
      const safe = rel.name.split('/releases/')[1].replace(/[^\w.-]+/g, '_');
      await out(`rules/other/${safe}.rules`, source);
    }
  }
  return { releases: releases.map((r) => r.name), published: found };
});

await section('auth.users', async () => {
  const auth = getAuth(app);
  const file = path.join(OUT_DIR, 'auth', 'users.ndjson');
  await mkdir(path.dirname(file), { recursive: true });
  const stream = createWriteStream(file);
  let n = 0;
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      // Sem passwordHash/passwordSalt: senhas não serão migradas.
      stream.write(JSON.stringify({
        uid: u.uid,
        email: u.email ?? null,
        email_verified: u.emailVerified,
        display_name: u.displayName ?? null,
        phone_number: u.phoneNumber ?? null,
        photo_url: u.photoURL ?? null,
        disabled: u.disabled,
        providers: u.providerData.map((p) => p.providerId),
        custom_claims: u.customClaims ?? null,
        created_at: u.metadata.creationTime,
        last_sign_in_at: u.metadata.lastSignInTime ?? null,
      }) + '\n');
      n += 1;
    }
    pageToken = page.pageToken;
  } while (pageToken);
  await new Promise((r) => stream.end(r));
  manifest.counts.auth_users = n;
  return { users: n };
});

await section('auth.config', async () => {
  const cfg = await googleApi(`https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`);
  let idps = {};
  try {
    idps = await googleApi(`https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/defaultSupportedIdpConfigs`);
    // remove segredos OAuth
    for (const c of idps.defaultSupportedIdpConfigs || []) delete c.clientSecret;
  } catch (e) {
    idps = { error: e?.message };
  }
  await out('auth/config.json', {
    authorized_domains: cfg.authorizedDomains,
    sign_in: cfg.signIn,
    multi_tenant: cfg.multiTenant,
    notification: cfg.notification,
    blocking_functions: cfg.blockingFunctions,
    idp_configs: idps,
  });
  return { authorized_domains: cfg.authorizedDomains };
});

await section('storage', async () => {
  if (!BUCKET) return { skipped: 'sem bucket' };
  const bucket = getStorage(app).bucket(BUCKET);
  const [files] = await bucket.getFiles({ autoPaginate: true });
  const file = path.join(OUT_DIR, 'storage', 'objects.ndjson');
  await mkdir(path.dirname(file), { recursive: true });
  const stream = createWriteStream(file);
  let bytes = 0;
  for (const f of files) {
    const m = f.metadata;
    bytes += Number(m.size || 0);
    stream.write(JSON.stringify({ name: f.name, size: Number(m.size || 0), content_type: m.contentType, updated: m.updated, md5: m.md5Hash }) + '\n');
    if (DOWNLOAD_STORAGE) {
      const dest = path.join(OUT_DIR, 'storage', 'objects', f.name);
      await mkdir(path.dirname(dest), { recursive: true });
      await f.download({ destination: dest });
    }
  }
  await new Promise((r) => stream.end(r));
  manifest.counts.storage_objects = files.length;
  return { objects: files.length, bytes, downloaded: DOWNLOAD_STORAGE };
});

// ---------- manifesto com hashes ----------
async function hashTree(dir) {
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name);
    if ((await stat(full)).isDirectory()) await hashTree(full);
    else if (name !== 'manifest.json') {
      const buf = await readFile(full);
      manifest.files[path.relative(OUT_DIR, full).replace(/\\/g, '/')] = {
        bytes: buf.length,
        sha256: createHash('sha256').update(buf).digest('hex'),
      };
    }
  }
}
await hashTree(OUT_DIR);
await out('manifest.json', manifest);

const failed = Object.entries(manifest.sections).filter(([, s]) => !s.ok);
console.log(`\nCaptura em ${OUT_DIR}`);
if (failed.length) {
  console.log(`Seções com falha (${failed.length}): ${failed.map(([n]) => n).join(', ')}. Ver manifest.json.`);
  process.exitCode = 2;
}
