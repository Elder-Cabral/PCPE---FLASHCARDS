import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase configuration.
// NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be provided in the environment.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Provide a safe stub to avoid runtime errors during build/prerender when env is absent.
  console.warn('Supabase URL or anon key not provided. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.');
  const noopResult = async () => ({ data: null, error: null });
  supabase = {
    __isStub: true,
    from: () => ({ select: noopResult, upsert: noopResult, insert: noopResult, update: noopResult }),
    auth: { signInWithPassword: async () => ({ data: null, error: new Error('Supabase not configured') }) },
  };
}

export { supabase };
