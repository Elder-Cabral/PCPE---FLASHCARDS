/** @typedef {import('../../../types').AppUser} AppUser */
/** @typedef {import('../../../types').MeResponse} MeResponse */
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET, JWT_ISSUER, SESSION_COOKIE } from '../../../../lib/jwt-config';

/**
 * GET /api/auth/me — valida JWT e retorna usuário
 * @param {import('next/server').NextRequest} request
 * @returns {Promise<NextResponse>}
 */
export async function GET(request) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: JWT_ISSUER });

    return NextResponse.json({
      authenticated: true,
      user: {
        username: payload.username,
        role: payload.role,
        name: payload.name,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
