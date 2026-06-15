/**
 * @typedef {import('next/server').NextResponse} NextResponse
 */

export const SESSION_COOKIE = 'pcpe_session';

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('[jwt-config] ⚠️ JWT_SECRET não definido. Usando fallback inseguro. Defina JWT_SECRET no .env.local');
}
export const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod');
export const JWT_ISSUER = 'pcpe-flashcards';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * @param {NextResponse} response
 * @param {string} token
 * @param {number} maxAge
 */
export function setSessionCookie(response, token, maxAge = SESSION_MAX_AGE) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  });
}

/**
 * @param {NextResponse} response
 */
export function clearSessionCookie(response) {
  setSessionCookie(response, '', 0);
}
