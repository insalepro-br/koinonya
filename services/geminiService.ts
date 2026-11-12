import { auth } from '../lib/firebase';

/**
 * Client-side proxy service for AI-powered humanized communication.
 * All Gemini API calls are securely processed server-side via Express routes with bearer tokens.
 */

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.warn("Could not retrieve auth token for AI request:", err);
  }
  return headers;
};

export const generateHumanizedMessage = async (
  memberName: string, 
  stage: string, 
  context: string
): Promise<string> => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/gemini/generate-message', {
      method: 'POST',
      headers,
      body: JSON.stringify({ memberName, stage, context }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${res.status}`);
    }

    const data = await res.json();
    return data.text || `Olá ${memberName}! Notamos sua presença e gostaríamos de saber como você está. Vamos conversar?`;
  } catch (error) {
    console.error("Erro ao gerar mensagem humanizada via servidor:", error);
    return `Olá ${memberName}! Notamos sua presença e gostaríamos de saber como você está. Vamos conversar?`;
  }
};

export const generateMessageStream = async (
  prompt: string,
  onChunk: (text: string) => void,
  systemInstruction?: string
): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/gemini/generate-stream', {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, systemInstruction }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Falha na conexão de streaming: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') return;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) onChunk(parsed.text);
          } catch {
            // ignore malformed SSE line
          }
        }
      }
    }
  } catch (err) {
    console.error("Erro no streaming Gemini:", err);
    throw err;
  }
};
