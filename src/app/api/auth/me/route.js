import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod');
const JWT_ISSUER = 'pcpe-flashcards';

export async function GET(request) {
  try {
    const token = request.cookies.get('pcpe_session')?.value;
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
