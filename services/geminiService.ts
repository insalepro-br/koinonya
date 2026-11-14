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
