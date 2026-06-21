/** @typedef {import('../../../types').AppUser} AppUser */
/** @typedef {import('../../../types').LoginResponse} LoginResponse */
/** @typedef {import('../../../types').LocalUser} LocalUser */
import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { JWT_SECRET, JWT_ISSUER, SESSION_MAX_AGE, SESSION_COOKIE, setSessionCookie } from '../../../../lib/jwt-config';

// Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5; // 5 attempts per window

// Limpeza periódica de entradas expiradas do rate limit
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap) {
      if (now - entry.windowStart > RATE_LIMIT_WINDOW) {
        rateLimitMap.delete(ip);
      }
    }
  }, 60 * 1000); // a cada 1 minuto
}

/**
 * @param {string} ip
 * @returns {{ allowed: boolean, retryAfter?: number, remaining?: number }}
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

/**
 * @param {AppUser} payload
 * @returns {Promise<{token: string, exp: number}>}
 */
async function signSessionToken(payload) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + SESSION_MAX_AGE;
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setIssuer(JWT_ISSUER)
    .setExpirationTime(exp)
    .sign(JWT_SECRET);
  return { token, exp };
}

/**
 * POST /api/auth/login
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function POST(request) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const limit = checkRateLimit(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em alguns minutos.', retryAfter: limit.retryAfter },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username, password, loginMethod, typedUsername, name, accessToken } = body;

    if (!username || typeof username !== 'string' || username.length > 200) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }
    if (password !== undefined && (typeof password !== 'string' || password.length > 256)) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    let user = null;

    if (loginMethod === 'supabase') {
      if (!accessToken) {
        return NextResponse.json({ error: 'Token de acesso ausente' }, { status: 401 });
      }

      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supaUrl || !supaKey) {
        return NextResponse.json({ error: 'Supabase não configurado no servidor' }, { status: 500 });
      }

      // Validação do token com a API do Supabase
      const verificationClient = createClient(supaUrl, supaKey, { auth: { persistSession: false } });
      const { data: { user: verifiedUser }, error: verifyError } = await verificationClient.auth.getUser(accessToken);

      if (verifyError || !verifiedUser) {
        return NextResponse.json({ error: 'Sessão Supabase inválida ou expirada' }, { status: 401 });
      }

      // Garante que o email retornado pelo Supabase confere com o e-mail da requisição
      const cleanVerifiedEmail = verifiedUser.email?.toLowerCase().trim();
      const cleanRequestEmail = username?.toLowerCase().trim();
      if (cleanVerifiedEmail !== cleanRequestEmail) {
        return NextResponse.json({ error: 'E-mail do token não corresponde ao e-mail enviado' }, { status: 401 });
      }

      let localRole = 'user';
      let localName = null;
      try {
        const filePath = path.join(process.cwd(), 'src', 'data', 'users.local.json');
        const raw = fs.readFileSync(filePath, 'utf8');
        const localUsers = JSON.parse(raw);
        // 1) Tenta o username original digitado (typedUsername)
        if (typedUsername) {
          const byTyped = localUsers.find(u => u.username === typedUsername.toLowerCase().trim());
          if (byTyped && byTyped.role) {
            localRole = byTyped.role;
            localName = byTyped.name || null;
          }
        }
        // 2) Se não achou, tenta match direto pelo username (pode ser o email)
        if (!localName) {
          const direct = localUsers.find(u => u.username === username?.toLowerCase().trim());
          if (direct && direct.role) {
            localRole = direct.role;
            localName = direct.name || null;
          }
        }
        // 3) Se ainda não achou, tenta reverse lookup via username_map
        if (!localName && username && username.includes('@')) {
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (serviceKey) {
            const serviceClient = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });
            const { data: row } = await serviceClient
              .from('username_map')
              .select('username')
              .eq('email', username.toLowerCase().trim())
              .maybeSingle();
            if (row?.username) {
              const mapped = localUsers.find(u => u.username === row.username.toLowerCase());
              if (mapped && mapped.role) {
                localRole = mapped.role;
                localName = mapped.name || null;
              }
            }
          }
        }
      } catch {}
      const safeName = localName || (typeof name === 'string' ? name.slice(0, 100) : username);
      user = { username, role: localRole, name: safeName };
    } else if (loginMethod === 'local') {
      if (!password) {
        return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
      }

      let localUsers = [];
      try {
        const filePath = path.join(process.cwd(), 'src', 'data', 'users.local.json');
        const raw = fs.readFileSync(filePath, 'utf8');
        localUsers = JSON.parse(raw);
      } catch {
        return NextResponse.json({ error: 'Erro interno de configuração' }, { status: 500 });
      }

      const uname = username.toLowerCase().trim();
      const match = localUsers.find(u =>
        u.username === uname &&
        u.passwordHash &&
        u.passwordHash.startsWith('$2a$')
      );

      if (!match) {
        return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 });
      }

      const ok = bcrypt.compareSync(password, match.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 });
      }

      user = { username: match.username, role: match.role, name: match.name };
    } else {
      // loginMethod inválido ou ausente
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const { token, exp } = await signSessionToken(user);

    const response = NextResponse.json({ success: true, user, expiresAt: exp * 1000 });
    setSessionCookie(response, token, SESSION_MAX_AGE);

    return response;
  } catch (e) {
    console.error('/api/auth/login error:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
