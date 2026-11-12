import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, LiveServerMessage, Modality, ThinkingLevel } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Helper to instantiate server-side Gemini client with recommended User-Agent header
const getGenAIClient = (timeoutMs: number = 45000) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  return new GoogleGenAI({
    apiKey: apiKey || undefined,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
      timeout: timeoutMs,
    }
  });
};

// In-memory sliding window rate limiter for protecting Gemini AI endpoints
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const geminiRateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 40; // 40 requests per minute

  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (record.count >= maxRequests) {
    return res.status(429).json({
      error: 'Limite de requisições excedido. Por favor, aguarde um minuto antes de gerar novas mensagens.'
    });
  }

  record.count += 1;
  next();
};

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }
  // Allow graceful fallback in local dev if token isn't yet cached
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  return res.status(401).json({ error: 'Não autorizado. Autenticação obrigatória para recursos de IA.' });
};

// Humanized WhatsApp / Follow-up message generation endpoint
app.post('/api/gemini/generate-message', geminiRateLimiter, requireAuth, async (req, res) => {
  const { memberName, stage, context } = req.body;
  const name = memberName || 'Irmão(ã)';
  const currentStage = stage || 'contato';
  const ctx = context || 'Acompanhamento e cuidado pastoral';

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set on the server. Using warm default template.");
    const fallbackText = `Olá ${name}! Notamos sua presença conosco e gostaríamos de saber como você está. Podemos orar por você ou ajudá-lo em algo? Um grande abraço da liderança!`;
    return res.json({ text: fallbackText });
  }

  try {
    const ai = getGenAIClient(30000);
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Gere uma mensagem curta e acolhedora para o WhatsApp para um ${currentStage} chamado ${name}. 
Contexto: ${ctx}. 
Regras: Use tom caloroso, empático, evite parecer robô ou impessoal, use emojis com moderação, no máximo 2 parágrafos curtos.
Linguagem: Português do Brasil.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    const generatedText = response.text?.trim() || `Olá ${name}! Passando para saber como você está e desejar uma semana abençoada. Se precisar de algo, conte conosco!`;
    return res.json({ text: generatedText });
  } catch (error: any) {
    console.warn('Gemini aviso/contingência (/api/gemini/generate-message):', error?.message || error);
    const fallbackText = `Olá ${name}! Notamos sua presença conosco e gostaríamos de saber como você está. Podemos orar por você ou ajudá-lo em algo? Um grande abraço!`;
    return res.json({ 
      text: fallbackText,
      warning: error?.message || 'Usando mensagem padrão devido a instabilidade temporária.' 
    });
  }
});

// AI Pastoral Intelligence & Health Diagnostic endpoint
app.post('/api/gemini/pastoral-insights', geminiRateLimiter, requireAuth, async (req, res) => {
  const { 
    churchName, 
    totalMembers, 
    stageBreakdown, 
    stagnantCount, 
    topNeighborhoods, 
    leaderCount, 
    cellCount,
    cellConnectedMembers,
    cellConnectionRate,
    prayerThemes 
  } = req.body;

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    const fallbackInsight = `### 📊 Diagnóstico Pastoral Preliminar
**Saúde da Igreja:** Boa retenção com oportunidades claras de expansão nos lares.

**Principais Descobertas:**
- **Total no Sistema:** ${totalMembers || 0} vidas registradas.
- **Células & Pequenos Grupos:** ${cellCount || 0} células ativas com ${cellConnectedMembers || 0} membros conectados (${cellConnectionRate || 0}% de adesão).
- **Atenção Prioritária:** Existem ${stagnantCount || 0} pessoas com acompanhamento estagnado (> 14 dias sem interação).
- **Concentração Geográfica:** Bairros com maior presença: ${topNeighborhoods?.slice(0, 3).map((n: any) => n.name).join(', ') || 'Variados'}.

**3 Ações Pastorais Imediatas:**
1. **Mutirão de Follow-up (D+3 a D+7):** Mobilizar os líderes para ligar para os ${stagnantCount || 0} contatos parados.
2. **Plantio/Fortalecimento de Células:** Focar no bairro com maior densidade de visitantes para abrir uma nova célula nos lares.
3. **Qualificação de Líderes:** Reunião mensal com os consolidadores para redistribuir contatos e evitar sobrecarga.`;
    return res.json({ text: fallbackInsight });
  }

  try {
    const ai = getGenAIClient(45000);
    const prompt = `Você é um Consultor Sênior de Crescimento Eclesiástico e CRM Pastoral do sistema Koinonia.
Analise os dados reais desta igreja e gere um relatório de inteligência pastoral executivo, prático e encorajador.

DADOS DA IGREJA:
- Nome da Igreja: ${churchName || 'Igreja Local'}
- Total de Contatos/Membros: ${totalMembers || 0}
- Distribuição por Etapas do Pipeline: ${JSON.stringify(stageBreakdown || [])}
- Contatos Estagnados (> 14 dias sem contato): ${stagnantCount || 0}
- Células e Pequenos Grupos Ativos: ${cellCount || 0} grupos com ${cellConnectedMembers || 0} vidas conectadas (${cellConnectionRate || 0}% de taxa de adesão)
- Principais Bairros de Origem: ${JSON.stringify(topNeighborhoods || [])}
- Líderes Ativos no Sistema: ${leaderCount || 0}
- Temas de Interesses e Oração Frequentes: ${JSON.stringify(prayerThemes || [])}

ESTRUTURA DA RESPOSTA (Use Markdown limpo com títulos e tópicos diretos):
1. 🩺 **Score de Saúde Pastoral & Resumo Executivo** (Dê uma nota de 0 a 100 e 2 frases de resumo).
2. ⚠️ **Gargalos e Pontos Cegos Detectados** (ex: atrito de retenção, sobrecarga de consolidadores ou estagnação).
3. 🎯 **3 Recomendações Estratégicas para os Próximos 7 Dias** (ações pastorais e de células concretas).
4. 🏘️ **Estratégia de Expansão de Células nos Lares** (onde multiplicar grupos com base nos bairros e participantes).

Regras de Formatação: Seja conciso, direto e estruturado (máximo 300 palavras). Evite introduções longas ou rodeios.
Linguagem: Português do Brasil.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    const insightText = response.text?.trim();
    if (!insightText) {
      throw new Error('Resposta vazia do modelo.');
    }

    return res.json({ text: insightText });
  } catch (error: any) {
    console.warn('Gemini aviso/contingência (/api/gemini/pastoral-insights):', error?.message || error);
    
    // Fallback inteligente contextualizado com as métricas reais fornecidas
    const healthScore = Math.max(30, Math.min(95, Math.round(
      (cellConnectionRate ? Number(cellConnectionRate) * 0.5 : 35) + 
      ((totalMembers || 0) > 0 ? Math.max(0, 40 - ((stagnantCount || 0) / (totalMembers || 1)) * 30) : 25)
    )));
    const topNeighborhoodNames = Array.isArray(topNeighborhoods) && topNeighborhoods.length > 0
      ? topNeighborhoods.slice(0, 3).map((n: any) => n.name).join(', ')
      : 'Bairros Centrais e Adjacentes';

    const fallbackInsight = `### 🩺 Score de Saúde Pastoral: ${healthScore}/100
Comunidade em desenvolvimento com **${totalMembers || 0} vidas cadastradas** e **${cellCount || 0} pequenos grupos** ativos. O foco imediato deve ser o resgate das pessoas com acompanhamento pendente.

### ⚠️ Gargalos e Pontos Cegos Detectados
- **Estagnação no Pipeline:** Identificamos ${stagnantCount || 0} pessoa(s) sem contato há mais de 14 dias.
- **Adesão às Células:** ${cellConnectedMembers || 0} membro(s) participam de células (${cellConnectionRate || 0}% de cobertura).

### 🎯 3 Recomendações Estratégicas para os Próximos 7 Dias
1. **Mutirão de Resgate (D+0 a D+7):** Enviar mensagens acolhedoras via WhatsApp para os ${stagnantCount || 0} contatos estagnados.
2. **Integração Visitante ➔ Célula:** Convidar novos visitantes para o pequeno grupo mais próximo de sua residência.
3. **Distribuição com os Líderes:** Reunir os ${leaderCount || 1} líderes para equilibrar os contatos sob consolidação.

### 🏘️ Estratégia de Expansão de Células nos Lares
- Priorizar a abertura ou fortalecimento de pontos de encontro em: **${topNeighborhoodNames}**.`;

    return res.json({
      text: fallbackInsight,
      warning: error?.message || 'Diagnóstico pastoral compilado a partir das métricas locais.'
    });
  }
});

// Server-Sent Events streaming endpoint
app.post('/api/gemini/generate-stream', geminiRateLimiter, requireAuth, async (req, res) => {
  const { prompt, model = 'gemini-4-hydrogen', systemInstruction } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt é obrigatório.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const ai = getGenAIClient();
    const stream = await ai.models.generateContentStream({
      model,
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.warn('Gemini streaming notice (/api/gemini/generate-stream):', error?.message || error);
    res.write(`data: ${JSON.stringify({ error: error?.message || 'Erro durante a transmissão.' })}\n\n`);
    res.end();
  }
});

// Generic text generation endpoint
app.post('/api/gemini/generate', geminiRateLimiter, requireAuth, async (req, res) => {
  const { prompt, model = 'gemini-4-hydrogen', systemInstruction } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt é obrigatório.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
  }

  try {
    const ai = getGenAIClient();
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });

    return res.json({ text: response.text });
  } catch (error: any) {
    console.warn('Gemini server notice (/api/gemini/generate):', error?.message || error);
    return res.status(500).json({ error: error?.message || 'Erro ao processar conteúdo com Gemini.' });
  }
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket server for Gemini Live API real-time sessions
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = request.url || '';
  if (url === '/api/gemini/live' || url === '/live') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', async (clientWs: WebSocket) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    clientWs.send(JSON.stringify({ error: 'GEMINI_API_KEY não configurada.' }));
    clientWs.close();
    return;
  }

  try {
    const ai = getGenAIClient();
    const session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction: 'Você é o assistente pastoral e de acolhimento inteligente do Koinonia CRM.',
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          for (const part of message.serverContent?.modelTurn?.parts ?? []) {
            if (part.inlineData?.data) {
              clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
            }
          }
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.close();
          }
        }
      },
    });

    clientWs.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
      } catch (e) {
        console.error('Error handling client WS message:', e);
      }
    });

    clientWs.on('close', () => {
      session.close();
    });
  } catch (err: any) {
    console.error('Failed to establish Live session:', err);
    clientWs.send(JSON.stringify({ error: err?.message || 'Falha ao iniciar Live API.' }));
    clientWs.close();
  }
});

// Start server and mount Vite in development or static assets in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
