import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod');
const JWT_ISSUER = 'pcpe-flashcards';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5; // 5 attempts per window

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

async function signSessionToken(payload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

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
    const { username, password, loginMethod, role, name } = body;

    if (!username) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    let user = null;

    if (loginMethod === 'supabase') {
      user = { username, role: role || 'user', name: name || username };
    } else {
      // Local auth: read users.local.json and verify bcrypt
      if (!password) {
        return NextResponse.json({ error: 'Senha obrigatória' }, { status: 401 });
      }

      let localUsers = [];
      try {
        const filePath = path.join(process.cwd(), 'src', 'data', 'users.local.json');
        const raw = fs.readFileSync(filePath, 'utf8');
        localUsers = JSON.parse(raw);
      } catch {
        return NextResponse.json({ error: 'Autenticação local não configurada' }, { status: 500 });
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
    }

    const token = await signSessionToken(user);

    const response = NextResponse.json({ success: true, user });
    response.cookies.set('pcpe_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
