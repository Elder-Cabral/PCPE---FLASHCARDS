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

    const [userMetaRes, progressRes, pomodoroRes, suggestionsRes] = await Promise.all([
      adminClient.from('user_meta').select('*'),
      adminClient.from('user_progress').select('username, updated_at'),
      adminClient.from('pomodoro_log').select('*'),
      adminClient.from('suggestions').select('*').eq('status', 'pending'),
    ]);

    const users = {};
    if (userMetaRes.data) {
      for (const row of userMetaRes.data) {
        users[row.username] = { ...users[row.username], ...row };
      }
    }
    if (progressRes.data) {
      for (const row of progressRes.data) {
        if (!users[row.username]) users[row.username] = {};
        users[row.username].lastActivity = row.updated_at;
        let srs = row.srs_data || {};
        if (typeof srs === 'string') try { srs = JSON.parse(srs); } catch {}
        const totalCards = Object.keys(srs).length;
        const studiedToday = Object.values(srs).filter(s => {
          const nextReview = s.nextReview || s.next_review;
          if (!nextReview) return false;
          const d = new Date(nextReview);
          const today = new Date();
          return d.toDateString() === today.toDateString();
        }).length;
        users[row.username].totalCards = (users[row.username].totalCards || 0) + totalCards;
        users[row.username].studiedToday = (users[row.username].studiedToday || 0) + studiedToday;
      }
    }

    return NextResponse.json({
      users: Object.entries(users).map(([username, data]) => ({
        username,
        current_streak: data.current_streak ?? 0,
        shields_available: data.shields_available ?? 3,
        shields_exhausted_at: data.shields_exhausted_at || null,
        last_study_date: data.last_study_date || null,
        lastActivity: data.lastActivity || null,
        totalCards: data.totalCards || 0,
        studiedToday: data.studiedToday || 0,
      })),
      totalUsers: Object.keys(users).length,
      pendingSuggestions: suggestionsRes.data?.length || 0,
    });
  } catch (e) {
    console.error('/api/admin/stats error:', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
