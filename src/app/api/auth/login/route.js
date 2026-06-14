import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { username, role, name } = await request.json();

    if (!username) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionData = JSON.stringify({ username, role: role || 'user', name: name || username });

    const response = NextResponse.json({ success: true });
    response.cookies.set('pcpe_session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
