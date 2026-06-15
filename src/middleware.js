import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod');
const JWT_ISSUER = 'pcpe-flashcards';

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout', '/api/auth/me'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  // Skip auth check for public paths and static assets
  if (PUBLIC_PATHS.includes(pathname)) {
    return response;
  }

  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return response;
  }

  // Validate JWT session cookie on all other routes
  const token = request.cookies.get('pcpe_session')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET, { issuer: JWT_ISSUER });
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.ico$).*)',
  ],
};
