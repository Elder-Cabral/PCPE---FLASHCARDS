import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/logout'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return response;
  }

  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.ico$).*)',
  ],
};
