// =============================================================================
// HarvestFile - Individual Alert API (PATCH/DELETE)
// Phase 3D: Uses created_by for ownership check
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const allowed = ['threshold', 'condition', 'is_active', 'trigger_mode', 'cooldown_minutes', 'state', 'notify_email'];
    const updates: Record<string, any> = {};
    for (const f of allowed) {
      if (body[f] !== undefined) updates[f] = body[f];
    }
    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
    }

    const { data: alert, error } = await supabase
      .from('price_alerts')
      .update(updates)
      .eq('id', id)
      .eq('created_by', user.id)
      .select()
      .single();

    if (error) throw error;
    if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    return NextResponse.json({ alert });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase
      .from('price_alerts')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
