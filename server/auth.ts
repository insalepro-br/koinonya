import type { NextFunction, Request, Response } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

/**
 * Verificação de JWT por JWKS, sem credenciais de servidor.
 *
 * AUTH_PROVIDER=firebase (padrão enquanto o front usa Firebase Auth)
 *   FIREBASE_PROJECT_ID obrigatório.
 * AUTH_PROVIDER=supabase (após a migração)
 *   SUPABASE_URL obrigatório.
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
  jwksUrl: string;
  issuer: string;
  audience: string;
}

function resolveConfig(): VerifierConfig {
  const provider = (process.env.AUTH_PROVIDER || 'firebase').toLowerCase();
  if (provider === 'supabase') {
    const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
    if (!url) throw new Error('SUPABASE_URL é obrigatório com AUTH_PROVIDER=supabase');
    return {
      jwksUrl: `${url}/auth/v1/.well-known/jwks.json`,
      issuer: `${url}/auth/v1`,
      audience: 'authenticated',
    };
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID é obrigatório com AUTH_PROVIDER=firebase');
  return {
    jwksUrl: 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  };
}

const config = resolveConfig();
const jwks = createRemoteJWKSet(new URL(config.jwksUrl));

export function authInfo() {
  return { issuer: config.issuer, audience: config.audience };
}

export async function verifyBearer(header: string | undefined): Promise<AuthUser | null> {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const { payload } = await jwtVerify(token, jwks, {
    issuer: config.issuer,
    audience: config.audience,
  });
  if (!payload.sub) return null;
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
