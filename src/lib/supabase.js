import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Evita quebra de compilação (build) se as chaves do Supabase não estiverem definidas
const isConfigured = supabaseUrl.startsWith('http');

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: new Error("Supabase não configurado") })
          })
        }),
        upsert: () => Promise.resolve({ data: null, error: new Error("Supabase não configurado") })
      })
    };
