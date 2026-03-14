// =============================================================================
// HarvestFile - Price Alerts API
// Phase 3D: Uses created_by, org_id, condition, threshold columns
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/alerts — list user's alerts
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: alerts, error } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ alerts: alerts || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/alerts — create a new alert
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { commodity, threshold, condition, trigger_mode, state } = body;

    if (!commodity || threshold === undefined || !condition) {
      return NextResponse.json({ error: 'Missing: commodity, threshold, condition' }, { status: 400 });
    }

    const validCommodities = ['CORN', 'SOYBEANS', 'WHEAT', 'SORGHUM', 'COTTON', 'RICE', 'BARLEY', 'OATS', 'PEANUTS'];
    if (!validCommodities.includes(commodity.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid commodity' }, { status: 400 });
    }

    if (condition !== 'above' && condition !== 'below') {
      return NextResponse.json({ error: 'Condition must be "above" or "below"' }, { status: 400 });
    }

    // Get user's org_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    // Free users: max 3 active alerts
    if (!profile || profile.subscription_tier === 'free') {
      const { count } = await supabase
        .from('price_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('is_active', true);
      if ((count || 0) >= 3) {
        return NextResponse.json({ error: 'Free plan limited to 3 alerts. Upgrade to Pro for unlimited.' }, { status: 403 });
      }
    }

    // Get org_id from farmers or organizations table
    let orgId = user.id; // fallback
    const { data: farmer } = await supabase
      .from('farmers')
      .select('org_id')
      .eq('added_by', user.id)
      .limit(1)
      .single();
    if (farmer?.org_id) orgId = farmer.org_id;

    const { data: alert, error } = await supabase
      .from('price_alerts')
      .insert({
        org_id: orgId,
        created_by: user.id,
        commodity: commodity.toUpperCase(),
        threshold: parseFloat(threshold),
        condition,
        state: state || 'OH',
        trigger_mode: trigger_mode || 'rearm',
        is_active: true,
        notify_email: true,
        notify_sms: false,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ alert }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
