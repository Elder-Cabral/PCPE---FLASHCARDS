import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qywadtazswulvzklzfdu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5d2FkdGF6c3d1bHZ6a2x6ZmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTA3MjgsImV4cCI6MjA5NjU4NjcyOH0.KQMmYq8JJWzzDGVPk2rnyCG73FEILKncUz4rahN21Kw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
