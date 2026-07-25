// =============================================================================
// HarvestFile — GET /api/auth/header-cta
// Hotfix R2.1 Item A: auth resolution for the marketing-header client island.
//
// The marketing header can no longer read cookies (it renders inside the
// static/ISR /[state]/... pages — see HeaderAuthCta.tsx). Route handlers are
// dynamic by nature, so the cookie read is safe here. Runs the same SHORT
// farms.sellscore_active chain (owner_id = auth.uid(), newest farm wins) as
// /sellscore/me — one source of truth for "paid".
//
// Only called when a local Supabase session exists in the browser, so the
// anonymous SEO majority never invokes this function.
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { authenticated: false, paidSellScore: false },
        { headers: NO_STORE }
      );
    }

    const { data: farm } = await supabase
      .from('farms')
      .select('sellscore_active')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json(
      { authenticated: true, paidSellScore: !!farm?.sellscore_active },
      { headers: NO_STORE }
    );
  } catch {
    // Fail toward the logged-out default — the header must never break.
    return NextResponse.json(
      { authenticated: false, paidSellScore: false },
      { headers: NO_STORE }
    );
  }
}
