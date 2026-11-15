import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { authInfo, requireAuth } from './server/auth';

// Carrega .env local quando existir (Railway injeta variáveis direto no ambiente).
if (existsSync('.env')) process.loadEnvFile('.env');

// __PROD_BUILD__ é definido pelo esbuild no build do servidor (dist-server).
declare const __PROD_BUILD__: boolean | undefined;
const IS_PROD = (typeof __PROD_BUILD__ !== 'undefined' && __PROD_BUILD__) || process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-4-hydrogen';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const STATIC_DIR = path.resolve(process.env.STATIC_DIR || 'dist');

const app = express();

// Railway/proxies: usa o IP real do cliente em req.ip.
app.set('trust proxy', 1);
app.disable('x-powered-by');
// Origens externas permitidas no navegador: Supabase (API + Realtime), ViaCEP e Google Fonts.
// Em dev o Vite injeta scripts inline e usa WebSocket próprio, então a CSP vale só em produção.
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').origin;
  } catch {
    return '';
  }
})();
const SUPABASE_WS = SUPABASE_ORIGIN.replace(/^http/, 'ws');

app.use(
  helmet({
    contentSecurityPolicy: IS_PROD
      ? {
          useDefaults: false,
          directives: {
            'default-src': ["'self'"],
            'script-src': ["'self'"],
            'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            'font-src': ["'self'", 'https://fonts.gstatic.com'],
            'img-src': ["'self'", 'data:', 'blob:', 'https:'],
            // Google Fonts aqui também: o service worker do PWA busca a fonte com fetch(),
            // que obedece ao connect-src. Sem isso a Inter falha e cai na fonte genérica.
            'connect-src': [
              "'self'",
              SUPABASE_ORIGIN,
              SUPABASE_WS,
              'https://viacep.com.br',
              'https://fonts.googleapis.com',
              'https://fonts.gstatic.com',
            ].filter(Boolean),
            'worker-src': ["'self'"],
            'manifest-src': ["'self'"],
            'frame-ancestors': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'object-src': ["'none'"],
          },
        }
      : false,
    // Login com Google é por redirecionamento (Supabase), sem popup: isolamento total da janela.
    crossOriginOpenerPolicy: { policy: 'same-origin' },
  }),
);
app.use(express.json({ limit: '100kb' }));

const getGenAIClient = (timeoutMs = 45000) =>
  new GoogleGenAI({ apiKey: GEMINI_API_KEY, httpOptions: { timeout: timeoutMs } });

/** Corta strings vindas do cliente antes de entrar no prompt. */
const clip = (v: unknown, max: number, fallback = ''): string =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback;
const num = (v: unknown): number => (Number.isFinite(Number(v)) ? Number(v) : 0);
const jsonClip = (v: unknown, max: number): string => {
  try {
    return JSON.stringify(Array.isArray(v) ? v.slice(0, 30) : v ?? []).slice(0, max);
  } catch {
    return '[]';
  }
};

// Limite por usuário autenticado (memória do processo; um único serviço no Railway).
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const aiRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const key = req.user?.uid || req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 20;
  const record = rateLimitMap.get(key);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return next();
  }
  if (record.count >= maxRequests) {
    return res.status(429).json({ error: 'Limite de requisições excedido. Aguarde um minuto.' });
  }
  record.count += 1;
  return next();
};
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap) if (now > v.resetTime) rateLimitMap.delete(k);
}, 5 * 60_000).unref();

// ---------- rotas ----------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    env: IS_PROD ? 'production' : 'development',
    gemini: Boolean(GEMINI_API_KEY),
    gemini_model: GEMINI_MODEL,
    auth: authInfo(),
    time: new Date().toISOString(),
  });
});

// Mensagem humanizada de WhatsApp / follow-up
app.post('/api/gemini/generate-message', requireAuth, aiRateLimiter, async (req, res) => {
  const name = clip(req.body?.memberName, 80, 'Irmão(ã)');
  const currentStage = clip(req.body?.stage, 60, 'contato');
  const ctx = clip(req.body?.context, 500, 'Acompanhamento e cuidado pastoral');
  const fallbackText = `Olá ${name}! Notamos sua presença conosco e gostaríamos de saber como você está. Podemos orar por você ou ajudá-lo em algo? Um grande abraço da liderança!`;

  if (!GEMINI_API_KEY) return res.json({ text: fallbackText });

  try {
    const response = await getGenAIClient(30000).models.generateContent({
      model: GEMINI_MODEL,
      contents: `Gere uma mensagem curta e acolhedora para o WhatsApp para um ${currentStage} chamado ${name}.
Contexto: ${ctx}.
Regras: Use tom caloroso, empático, evite parecer robô ou impessoal, use emojis com moderação, no máximo 2 parágrafos curtos.
Linguagem: Português do Brasil.`,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
    });
    return res.json({ text: response.text?.trim() || fallbackText });
  } catch (error: any) {
    console.warn('Gemini (/api/gemini/generate-message):', error?.message || error);
    return res.json({ text: fallbackText, warning: 'Usando mensagem padrão devido a instabilidade temporária.' });
  }
});

// Diagnóstico pastoral
app.post('/api/gemini/pastoral-insights', requireAuth, aiRateLimiter, async (req, res) => {
  const b = req.body ?? {};
  const churchName = clip(b.churchName, 120, 'Igreja Local');
  const totalMembers = num(b.totalMembers);
  const stagnantCount = num(b.stagnantCount);
  const leaderCount = num(b.leaderCount);
  const cellCount = num(b.cellCount);
  const cellConnectedMembers = num(b.cellConnectedMembers);
  const cellConnectionRate = num(b.cellConnectionRate);
  const topNeighborhoods: { name: string }[] = Array.isArray(b.topNeighborhoods)
    ? b.topNeighborhoods.slice(0, 10).map((n: any) => ({ ...n, name: clip(n?.name, 80) }))
    : [];

  const topNeighborhoodNames =
    topNeighborhoods.length > 0
      ? topNeighborhoods.slice(0, 3).map((n) => n.name).join(', ')
      : 'Bairros Centrais e Adjacentes';

  const healthScore = Math.max(30, Math.min(95, Math.round(
    (cellConnectionRate ? cellConnectionRate * 0.5 : 35) +
    (totalMembers > 0 ? Math.max(0, 40 - (stagnantCount / (totalMembers || 1)) * 30) : 25),
  )));

  const fallbackInsight = `### 🩺 Score de Saúde Pastoral: ${healthScore}/100
Comunidade em desenvolvimento com **${totalMembers} vidas cadastradas** e **${cellCount} pequenos grupos** ativos. O foco imediato deve ser o resgate das pessoas com acompanhamento pendente.

### ⚠️ Gargalos e Pontos Cegos Detectados
- **Estagnação no Pipeline:** Identificamos ${stagnantCount} pessoa(s) sem contato há mais de 14 dias.
- **Adesão às Células:** ${cellConnectedMembers} membro(s) participam de células (${cellConnectionRate}% de cobertura).

### 🎯 3 Recomendações Estratégicas para os Próximos 7 Dias
1. **Mutirão de Resgate (D+0 a D+7):** Enviar mensagens acolhedoras via WhatsApp para os ${stagnantCount} contatos estagnados.
2. **Integração Visitante ➔ Célula:** Convidar novos visitantes para o pequeno grupo mais próximo de sua residência.
3. **Distribuição com os Líderes:** Reunir os ${leaderCount || 1} líderes para equilibrar os contatos sob consolidação.

### 🏘️ Estratégia de Expansão de Células nos Lares
- Priorizar a abertura ou fortalecimento de pontos de encontro em: **${topNeighborhoodNames}**.`;

  if (!GEMINI_API_KEY) return res.json({ text: fallbackInsight });

  const prompt = `Você é um Consultor Sênior de Crescimento Eclesiástico e CRM Pastoral do sistema Koinonia.
Analise os dados reais desta igreja e gere um relatório de inteligência pastoral executivo, prático e encorajador.

DADOS DA IGREJA:
- Nome da Igreja: ${churchName}
- Total de Contatos/Membros: ${totalMembers}
- Distribuição por Etapas do Pipeline: ${jsonClip(b.stageBreakdown, 1500)}
- Contatos Estagnados (> 14 dias sem contato): ${stagnantCount}
- Células e Pequenos Grupos Ativos: ${cellCount} grupos com ${cellConnectedMembers} vidas conectadas (${cellConnectionRate}% de taxa de adesão)
- Principais Bairros de Origem: ${jsonClip(topNeighborhoods, 1000)}
- Líderes Ativos no Sistema: ${leaderCount}
- Temas de Interesses e Oração Frequentes: ${jsonClip(b.prayerThemes, 1000)}

ESTRUTURA DA RESPOSTA (Use Markdown limpo com títulos e tópicos diretos):
1. 🩺 **Score de Saúde Pastoral & Resumo Executivo** (Dê uma nota de 0 a 100 e 2 frases de resumo).
2. ⚠️ **Gargalos e Pontos Cegos Detectados** (ex: atrito de retenção, sobrecarga de consolidadores ou estagnação).
3. 🎯 **3 Recomendações Estratégicas para os Próximos 7 Dias** (ações pastorais e de células concretas).
4. 🏘️ **Estratégia de Expansão de Células nos Lares** (onde multiplicar grupos com base nos bairros e participantes).

Regras de Formatação: Seja conciso, direto e estruturado (máximo 300 palavras). Evite introduções longas ou rodeios.
Linguagem: Português do Brasil.`;

  try {
    const response = await getGenAIClient(45000).models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
    });
    const insightText = response.text?.trim();
    if (!insightText) throw new Error('Resposta vazia do modelo.');
    return res.json({ text: insightText });
  } catch (error: any) {
    console.warn('Gemini (/api/gemini/pastoral-insights):', error?.message || error);
    return res.json({ text: fallbackInsight, warning: 'Diagnóstico compilado a partir das métricas locais.' });
  }
});

// Qualquer outra rota /api responde JSON 404 (nunca o index.html).
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// ---------- páginas legais (HTML estático, legível sem JavaScript: exigido pelo Google OAuth) ----------
const LEGAL_DIR = path.join(IS_PROD ? STATIC_DIR : path.resolve('public'), 'legal');
app.get(['/privacidade', '/termos'], (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(LEGAL_DIR, `${req.path.slice(1)}.html`));
});

// ---------- front ----------
async function startServer() {
  if (IS_PROD) {
    if (!existsSync(path.join(STATIC_DIR, 'index.html'))) {
      console.error(`Build do front ausente em ${STATIC_DIR}. Rode "pnpm build".`);
      process.exit(1);
    }
    app.use(
      express.static(STATIC_DIR, {
        index: false,
        setHeaders: (res, filePath) => {
          // Arquivos com hash do Vite (assets/nome-AbC123xy.js) podem ficar em cache para sempre;
          // sw.js, manifest e demais precisam revalidar para o PWA atualizar.
          const hashed = /[\\/]assets[\\/].+-[A-Za-z0-9_-]{8}\.\w+$/.test(filePath);
          res.setHeader('Cache-Control', hashed ? 'public, max-age=31536000, immutable' : 'no-cache');
        },
      }),
    );
    // Express 5 exige curinga nomeado.
    app.get('/{*splat}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(STATIC_DIR, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Koinonya (${IS_PROD ? 'produção' : 'dev'}) em http://localhost:${PORT}`);
    console.log(`Auth: ${authInfo().issuer} | Gemini: ${GEMINI_API_KEY ? GEMINI_MODEL : 'sem chave (respostas padrão)'}`);
  });
}

startServer();
