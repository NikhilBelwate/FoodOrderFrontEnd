import { createBrowserClient } from '@supabase/ssr';

// Singleton Supabase browser client
let client = null;

export function getSupabaseClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  client = createBrowserClient(url, key);
  return client;
}

export const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null;
