import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// =============================================================================
// /api/waitlist — server-side waitlist capture
// Writes to public.email_captures with a source label.
// Uses service role key to bypass RLS so we can write from the marketing surface
// without exposing the table to anon-key inserts.
// =============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_SOURCES = new Set([
  'planner_waitlist',
  'morning_waitlist',
  'check_followup',
])

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, source, module_interest } = (body ?? {}) as {
    email?: unknown
    source?: unknown
    module_interest?: unknown
  }

  // Validate email
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  const cleanEmail = email.trim().toLowerCase()

  // Validate source — accept only known sources, default to a safe label
  const cleanSource =
    typeof source === 'string' && ALLOWED_SOURCES.has(source)
      ? source
      : 'unknown'

  const cleanModuleInterest =
    typeof module_interest === 'string' && module_interest.length <= 64
      ? module_interest
      : null

  // Verify env config
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('[waitlist] Missing Supabase env config')
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 }
    )
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await supabase.from('email_captures').insert({
    email: cleanEmail,
    source: cleanSource,
    metadata: cleanModuleInterest ? { module_interest: cleanModuleInterest } : null,
  })

  if (error) {
    // Postgres unique-violation code — treat as success but flag deduped
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, deduped: true })
    }
    console.error('[waitlist] Insert error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// Reject all other methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
