import { defineRailway, preserve, project, service } from 'railway/iac';

// Infraestrutura do Railway como código (substitui o railway.json, lido só até 2026-12-01).
// Aplicar: railway config plan → railway config apply. Deploy do código: railway up (separado).
// Este repositório gerencia só os próprios recursos no ambiente.
export const partial = 'koinonya';

export default defineRailway(() => {
  const app = service('koinonya', {
    build: {
      builder: 'RAILPACK',
      buildCommand: 'pnpm build',
    },
    deploy: {
      startCommand: 'pnpm start',
      healthcheckPath: '/api/health',
      healthcheckTimeout: 60,
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 5,
    },
    // Sem NODE_ENV aqui: no build ele faria o pnpm pular devDependencies (vite, esbuild, tailwind).
    // O servidor já se marca como produção no build (__PROD_BUILD__).
    env: {
      AUTH_PROVIDER: 'firebase',
      FIREBASE_PROJECT_ID: 'gen-lang-client-0519033383',
      GEMINI_MODEL: 'gemini-4-hydrogen',
      // Segredo: definido no painel/CLI do Railway, nunca no código. preserve() mantém o valor já salvo.
      GEMINI_API_KEY: preserve(),
      // Dados fictícios automáticos no primeiro login. Lida no build do front; nunca true em produção.
      VITE_DEMO_SEED: 'false',
    },
  });

  return project('koinonya', {
    resources: [app],
  });
});
