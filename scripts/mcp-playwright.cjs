#!/usr/bin/env node
'use strict';
/*
 * Sobe o Playwright MCP do Koinonya (o .mcp.json aponta para cá). Mesmo
 * padrão do workspace platform.
 *
 * - Chrome visível, com perfil persistente em .playwright/profile (a sessão
 *   de login fica salva entre conversas). Um navegador por vez.
 * - Credenciais em .playwright/secrets.env. A IA digita o NOME da chave
 *   (ex.: KOI_DEV_SENHA) e o MCP põe o valor; nas respostas, o valor aparece
 *   como <secret>NOME</secret>.
 * - Prints e arquivos de saída em .playwright/saida (ignorado pelo git).
 * - Versão: a do package.json (devDependency exata).
 *
 * Carrega o CLI no mesmo processo: sem shell e sem npx, então caminho com
 * espaço não quebra. O stdout é do protocolo MCP; avisos vão para o stderr.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const raiz = path.resolve(__dirname, '..');
const pasta = path.join(raiz, '.playwright');

let cli;
try {
  const pacote = require.resolve('@playwright/mcp/package.json', { paths: [raiz] });
  const { bin } = JSON.parse(fs.readFileSync(pacote, 'utf8'));
  cli = path.join(path.dirname(pacote), typeof bin === 'string' ? bin : Object.values(bin)[0]);
} catch {
  process.stderr.write('Playwright MCP não instalado. Rode: pnpm install\n');
  process.exit(1);
}

const args = [
  '--browser', 'chrome',
  '--user-data-dir', path.join(pasta, 'profile'),
  '--output-dir', path.join(pasta, 'saida'),
  '--caps', 'network,storage',
];
const segredos = path.join(pasta, 'secrets.env');
if (fs.existsSync(segredos)) args.push('--secrets', segredos);
else process.stderr.write('Aviso: sem .playwright/secrets.env; o MCP sobe sem credenciais (copie de .playwright/secrets.env.example).\n');

process.argv = [process.argv[0], cli, ...args, ...process.argv.slice(2)];
import(pathToFileURL(cli).href).catch((e) => {
  process.stderr.write(`${(e && e.stack) || e}\n`);
  process.exit(1);
});
