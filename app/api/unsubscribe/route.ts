// =============================================================================
// HarvestFile — Unsubscribe API Route
// app/api/unsubscribe/route.ts
//
// Build 18 Deploy 6B: Handles email unsubscribe for leads/subscribers.
// Supports two methods per RFC 8058 + CAN-SPAM:
//
// POST /api/unsubscribe?token=LEAD_ID
//   → RFC 8058 one-click unsubscribe (Gmail/Yahoo "Unsubscribe" button)
//   → Must process without further user interaction
//   → Returns 200 OK
//
// GET /api/unsubscribe?token=LEAD_ID
//   → Visible footer link unsubscribe
//   → Returns confirmation HTML page
//
// Google/Yahoo require processing within 48 hours.
// We process immediately (within milliseconds).
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── RFC 8058: One-click unsubscribe (POST) ───────────────────────────────────
// Email clients (Gmail, Yahoo, Outlook) send POST to this endpoint when
// user clicks the "Unsubscribe" button in the email header.
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new NextResponse('Missing token', { status: 400 });
  }

  try {
    await supabase
      .from('leads')
      .update({
        status: 'unsubscribed',
        notify_enrollment: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', token);
  } catch (err) {
    console.error('[Unsubscribe] POST error:', err);
    // Still return 200 — RFC 8058 spec says always return success
  }

  return new NextResponse(null, { status: 200 });
}

// ── Visible footer link unsubscribe (GET) ────────────────────────────────────
// User clicks "Unsubscribe" link in email footer → sees confirmation page.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new NextResponse(renderPage('error', 'Invalid unsubscribe link.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 400,
    });
  }

  try {
    // Fetch lead to show email in confirmation
    const { data: lead } = await supabase
      .from('leads')
      .select('email, status')
      .eq('id', token)
      .single();

    if (!lead) {
      return new NextResponse(renderPage('error', 'This unsubscribe link is no longer valid.'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 404,
      });
    }

    if (lead.status === 'unsubscribed') {
      return new NextResponse(
        renderPage('already', `${lead.email} is already unsubscribed.`),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Process unsubscribe
    await supabase
      .from('leads')
      .update({
        status: 'unsubscribed',
        notify_enrollment: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', token);

    return new NextResponse(
      renderPage('success', `${lead.email} has been unsubscribed. You will no longer receive emails from HarvestFile.`),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (err) {
    console.error('[Unsubscribe] GET error:', err);
    return new NextResponse(
      renderPage('error', 'Something went wrong. Please try again or contact hello@harvestfile.com.'),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 500 }
    );
  }
}

// ── Confirmation page renderer ───────────────────────────────────────────────
function renderPage(type: 'success' | 'already' | 'error', message: string): string {
  const icon = type === 'error' ? '⚠️' : '✓';
  const heading =
    type === 'success' ? 'Unsubscribed'
    : type === 'already' ? 'Already Unsubscribed'
    : 'Something Went Wrong';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${heading} — HarvestFile</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f3f4f1;
      color: #1A1A1A;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 40px 32px;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .icon { font-size: 40px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #1B4332; }
    p { font-size: 15px; color: #6B7264; line-height: 1.6; margin-bottom: 24px; }
    a {
      display: inline-block;
      background: #1B4332;
      color: white;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
    }
    a:hover { background: #245741; }
    .footer { margin-top: 24px; font-size: 12px; color: #9CA38F; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${heading}</h1>
    <p>${message}</p>
    <a href="https://www.harvestfile.com">Return to HarvestFile</a>
    <div class="footer">HarvestFile LLC · Tallmadge, OH 44278</div>
  </div>
</body>
</html>`;
}
