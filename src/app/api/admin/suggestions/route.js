import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';
import { JWT_SECRET, JWT_ISSUER, SESSION_COOKIE } from '../../../../lib/jwt-config';

export async function GET(request) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: JWT_ISSUER });
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await adminClient
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('admin suggestions fetch error:', error);
      return NextResponse.json({ error: 'Erro ao buscar sugestões' }, { status: 500 });
    }

    return NextResponse.json({ suggestions: data || [] });
  } catch (e) {
    console.error('/api/admin/suggestions GET error:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: JWT_ISSUER });
    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body;
    if (!id || !status || !['pending', 'reviewed'].includes(status)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await adminClient
      .from('suggestions')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.error('admin suggestions update error:', error);
      return NextResponse.json({ error: 'Erro ao atualizar sugestão' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('/api/admin/suggestions PATCH error:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
