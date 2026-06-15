/**
 * @typedef {import('next/server').NextResponse} NextResponse
 */

export const SESSION_COOKIE = 'pcpe_session';

// Detect production environment
const isProd = process.env.NODE_ENV === 'production';

// JWT secret – required in production, fallback only for development/testing
if (!process.env.JWT_SECRET) {
  if (isProd) {
    console.error('[jwt-config] ❌ JWT_SECRET missing in production. Falling back to insecure placeholder.');
  } else {
    console.warn('[jwt-config] ⚠️ JWT_SECRET not defined. Using insecure fallback for development.');
  }
}
export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-dev-secret-do-not-use-in-prod'
);

// JWT issuer – can be overridden via env, default for dev
export const JWT_ISSUER = process.env.JWT_ISSUER || 'pcpe-flashcards';

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
