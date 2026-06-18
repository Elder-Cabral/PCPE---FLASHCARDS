import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';
import { JWT_SECRET, JWT_ISSUER, SESSION_COOKIE } from '../../../lib/jwt-config';

export async function POST(request) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: JWT_ISSUER });
    const username = payload.username;

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Mensagem inválida' }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'Mensagem muito longa (máx. 2000 caracteres)' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const client = createClient(supabaseUrl, supabaseAnonKey);
    const { error } = await client.from('suggestions').insert({
      username,
      message: message.trim(),
      status: 'pending',
    });

    if (error) {
      console.error('suggestions insert error:', error);
      return NextResponse.json({ error: 'Erro ao salvar sugestão' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('/api/suggestions error:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
