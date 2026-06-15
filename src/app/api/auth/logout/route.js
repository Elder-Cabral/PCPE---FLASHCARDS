import { NextResponse } from 'next/server';
import { clearSessionCookie } from '../../../../lib/jwt-config';

/**
 * POST /api/auth/logout — limpa cookie de sessão
 * @returns {Promise<NextResponse>}
 */
export async function POST() {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
