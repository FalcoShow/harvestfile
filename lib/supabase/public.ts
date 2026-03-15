// =============================================================================
// HarvestFile — Public Supabase Client (no auth required)
// Phase 5A: Used by county/state SEO pages where data is public read
//
// This avoids the cookies() dependency of lib/supabase/server.ts,
// making it safe for static generation and ISR.
// =============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});
