import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

/**
 * Verificação do JWT do Supabase Auth por JWKS (chaves públicas), sem segredo no servidor.
 * SUPABASE_URL obrigatório (ex.: https://<ref>.supabase.co ou http://127.0.0.1:54321 no local).
 *
 * Só aceita tokens de usuário logado (role "authenticated"): a chave publicável/anon não passa.
 */
export interface AuthUser {
  uid: string;
  email?: string;
  claims: JWTPayload;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface VerifierConfig {
  issuer: string;
  audience: string;
  jwks: ReturnType<typeof createRemoteJWKSet>;
}

// Lido no primeiro uso, não no import: em ESM os imports rodam antes do server.ts carregar o .env.
let cached: VerifierConfig | undefined;

function config(): VerifierConfig {
  if (cached) return cached;
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.replace(/\/$/, '');
  if (!url) throw new Error('SUPABASE_URL é obrigatório para validar o login (veja .env.example).');
  cached = {
    issuer: `${url}/auth/v1`,
    audience: 'authenticated',
    jwks: createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`)),
  };
  return cached;
}

export function authInfo() {
  const { issuer, audience } = config();
  return { provider: 'supabase', issuer, audience };
}

export async function verifyBearer(header: string | undefined): Promise<AuthUser | null> {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const { jwks, issuer, audience } = config();
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    audience,
    algorithms: ['ES256', 'RS256'],
  });
  if (!payload.sub || payload.role !== 'authenticated') return null;
  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    claims: payload,
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await verifyBearer(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Não autorizado. Faça login novamente.' });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}
