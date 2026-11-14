/**
 * Monta o kit para o Google Cloud Shell: um zip com o script de captura e os arquivos
 * da raiz que ele lê (config do Firebase e firestore.rules). Saída em exports/ (ignorado pelo git).
 *
 * Uso: pnpm pack:cloudshell
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const EXPORTS = path.join(ROOT, 'exports');
const STAGE = path.join(EXPORTS, 'koinonya-captura');
const ZIP = path.join(EXPORTS, 'koinonya-captura.zip');

const files: [from: string, to: string][] = [
  ['firebase-applet-config.json', 'firebase-applet-config.json'],
  ['firestore.rules', 'firestore.rules'],
  ...['capture.ts', 'cloudshell.sh', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json'].map(
    (f): [string, string] => [`scripts/firebase-capture/${f}`, `scripts/firebase-capture/${f}`],
  ),
];

rmSync(STAGE, { recursive: true, force: true });
rmSync(ZIP, { force: true });
for (const [from, to] of files) {
  const src = path.join(ROOT, from);
  if (!existsSync(src)) throw new Error(`Arquivo ausente: ${from}`);
  mkdirSync(path.dirname(path.join(STAGE, to)), { recursive: true });
  cpSync(src, path.join(STAGE, to));
}

// Windows: bsdtar do sistema gera zip pela extensão (o tar do Git Bash é GNU e não gera zip).
if (process.platform === 'win32') {
  const bsdtar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
  execFileSync(bsdtar, ['-a', '-c', '-f', ZIP, '-C', EXPORTS, 'koinonya-captura'], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-qr', ZIP, 'koinonya-captura'], { cwd: EXPORTS, stdio: 'inherit' });
}
rmSync(STAGE, { recursive: true, force: true });
console.log(`Kit: ${ZIP}`);
