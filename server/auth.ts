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

function resolveConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.replace(/\/$/, '');
  if (!url) throw new Error('SUPABASE_URL é obrigatório para validar o login.');
  return {
    jwksUrl: `${url}/auth/v1/.well-known/jwks.json`,
    issuer: `${url}/auth/v1`,
    audience: 'authenticated',
  };
}

const config = resolveConfig();
const jwks = createRemoteJWKSet(new URL(config.jwksUrl));

export function authInfo() {
  return { provider: 'supabase', issuer: config.issuer, audience: config.audience };
}

export async function verifyBearer(header: string | undefined): Promise<AuthUser | null> {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const { payload } = await jwtVerify(token, jwks, {
    issuer: config.issuer,
    audience: config.audience,
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
