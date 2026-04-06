// =============================================================================
// HarvestFile — Deploy 4: Unsubscribe API Route
// app/api/unsubscribe/route.ts
//
// Handles both:
//   1. RFC 8058 one-click unsubscribe (POST from Gmail/Yahoo)
//      - Gmail sends POST with body: List-Unsubscribe=One-Click
//      - Must return HTTP 200 with no redirect
//   2. Manual unsubscribe (GET from email footer link)
//      - Shows a confirmation page
//      - Prevents bot/crawler auto-unsubscription
//
// Security: HMAC-SHA256 token verification
//   - Token = HMAC(secret, subscriberId:email:digest)
//   - No token expiry (users click months-old emails)
//   - Idempotent (repeated clicks show same result)
//
// CAN-SPAM: Must honor within 48 hours (Google/Yahoo requirement)
// We honor immediately — no delay.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const HMAC_SECRET = process.env.DIGEST_HMAC_SECRET || process.env.LEAD_JWT_SECRET || 'harvestfile-digest-hmac-secret';

// ── HMAC verification ────────────────────────────────────────────────────────

function verifyToken(subscriberId: string, email: string, token: string): boolean {
  try {
    const payload = `${subscriberId}:${email}:digest`;
    const expected = createHmac('sha256', HMAC_SECRET)
      .update(payload)
      .digest('base64url');

    // Constant-time comparison to prevent timing attacks
    const tokenBuf = Buffer.from(token, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');

    if (tokenBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(tokenBuf, expectedBuf);
  } catch {
    return false;
  }
}

// ── POST: RFC 8058 one-click unsubscribe ─────────────────────────────────────
// Gmail/Yahoo send: POST /api/unsubscribe?token=X&id=Y
// Body: List-Unsubscribe=One-Click
// Must return 200 with NO redirect.

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const subscriberId = searchParams.get('id');

    if (!token || !subscriberId) {
      return new NextResponse('Missing parameters', { status: 400 });
    }

    // Look up subscriber
    const { data: subscriber, error: lookupError } = await supabase
      .from('subscribers')
      .select('id, email, status')
      .eq('id', subscriberId)
      .single();

    if (lookupError || !subscriber) {
      // Return 200 anyway — Gmail expects success even if already gone
      return new NextResponse('OK', { status: 200 });
    }

    // Verify HMAC token
    if (!verifyToken(subscriberId, subscriber.email, token)) {
      // Return 200 — don't reveal invalid tokens to email providers
      return new NextResponse('OK', { status: 200 });
    }

    // Already unsubscribed — idempotent
    if (subscriber.status === 'unsubscribed') {
      return new NextResponse('OK', { status: 200 });
    }

    // Unsubscribe
    await supabase
      .from('subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', subscriberId);

    // Also update the linked lead if exists
    await supabase
      .from('leads')
      .update({ status: 'unsubscribed' })
      .eq('email', subscriber.email);

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[Unsubscribe] POST error:', err);
    // Return 200 even on error — Gmail retries on non-200 which causes duplicates
    return new NextResponse('OK', { status: 200 });
  }
}

// ── GET: Manual unsubscribe from email footer ────────────────────────────────
// Shows a simple confirmation page. Does NOT auto-unsubscribe on GET
// (prevents bot/crawler unsubscriptions from link scanners).

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const subscriberId = searchParams.get('id');
    const confirmed = searchParams.get('confirmed');

    // Legacy support: if only token is provided (from drip campaign emails)
    // treat token as leadId and unsubscribe the lead directly
    if (token && !subscriberId) {
      return handleLegacyUnsubscribe(token, confirmed === 'true');
    }

    if (!token || !subscriberId) {
      return new NextResponse(renderPage('Invalid Link', 'This unsubscribe link is invalid or has expired.', false), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Look up subscriber
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('id, email, status')
      .eq('id', subscriberId)
      .single();

    if (!subscriber) {
      return new NextResponse(renderPage('Not Found', 'This subscription was not found.', false), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Verify HMAC
    if (!verifyToken(subscriberId, subscriber.email, token)) {
      return new NextResponse(renderPage('Invalid Link', 'This unsubscribe link is invalid.', false), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Already unsubscribed
    if (subscriber.status === 'unsubscribed') {
      return new NextResponse(
        renderPage('Already Unsubscribed', 'You have already been unsubscribed from HarvestFile emails.', false),
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // If not confirmed, show confirmation page
    if (confirmed !== 'true') {
      const confirmUrl = `/api/unsubscribe?token=${token}&id=${subscriberId}&confirmed=true`;
      return new NextResponse(
        renderConfirmPage(subscriber.email, confirmUrl),
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Confirmed — unsubscribe
    await supabase
      .from('subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', subscriberId);

    await supabase
      .from('leads')
      .update({ status: 'unsubscribed' })
      .eq('email', subscriber.email);

    return new NextResponse(
      renderPage('Unsubscribed', 'You have been unsubscribed from HarvestFile daily briefs. You can always re-subscribe at harvestfile.com.', false),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (err) {
    console.error('[Unsubscribe] GET error:', err);
    return new NextResponse(
      renderPage('Error', 'Something went wrong. Please try again or email hello@harvestfile.com.', false),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

// ── Legacy unsubscribe (drip campaign emails use leadId as token) ────────────

async function handleLegacyUnsubscribe(leadId: string, confirmed: boolean) {
  const { data: lead } = await supabase
    .from('leads')
    .select('id, email, status')
    .eq('id', leadId)
    .single();

  if (!lead) {
    return new NextResponse(renderPage('Not Found', 'This subscription was not found.', false), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (lead.status === 'unsubscribed') {
    return new NextResponse(
      renderPage('Already Unsubscribed', 'You have already been unsubscribed.', false),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  if (!confirmed) {
    const confirmUrl = `/api/unsubscribe?token=${leadId}&confirmed=true`;
    return new NextResponse(
      renderConfirmPage(lead.email, confirmUrl),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  await supabase.from('leads').update({ status: 'unsubscribed' }).eq('id', leadId);
  await supabase.from('subscribers').update({
    status: 'unsubscribed',
    unsubscribed_at: new Date().toISOString(),
  }).eq('email', lead.email);

  return new NextResponse(
    renderPage('Unsubscribed', 'You have been unsubscribed from HarvestFile emails.', false),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// ── HTML page renderers ──────────────────────────────────────────────────────

function renderPage(title: string, message: string, showResubscribe: boolean): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — HarvestFile</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f1;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}
.card{background:#fff;border-radius:12px;padding:40px;max-width:440px;width:100%;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.logo{color:#1B4332;font-size:20px;font-weight:700;margin-bottom:24px}.logo span{color:#34D399}
h1{font-size:22px;color:#1A1A1A;margin-bottom:12px}p{font-size:15px;color:#4b5563;line-height:1.6;margin-bottom:20px}
a.btn{display:inline-block;background:#1B4332;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px}
</style></head><body><div class="card"><div class="logo"><span>◆</span> HarvestFile</div><h1>${title}</h1><p>${message}</p>
${showResubscribe ? '<a href="https://www.harvestfile.com/morning" class="btn">Visit HarvestFile</a>' : ''}
</div></body></html>`;
}

function renderConfirmPage(email: string, confirmUrl: string): string {
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Unsubscribe — HarvestFile</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f1;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}
.card{background:#fff;border-radius:12px;padding:40px;max-width:440px;width:100%;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.logo{color:#1B4332;font-size:20px;font-weight:700;margin-bottom:24px}.logo span{color:#34D399}
h1{font-size:22px;color:#1A1A1A;margin-bottom:12px}p{font-size:15px;color:#4b5563;line-height:1.6;margin-bottom:20px}
.email{font-weight:600;color:#1A1A1A}
a.btn{display:inline-block;background:#dc2626;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-right:12px}
a.btn-secondary{display:inline-block;background:#fff;color:#1B4332;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;border:1px solid #1B4332}
</style></head><body><div class="card"><div class="logo"><span>◆</span> HarvestFile</div>
<h1>Unsubscribe?</h1>
<p>You&apos;re about to unsubscribe <span class="email">${maskedEmail}</span> from HarvestFile daily farm briefs.</p>
<p>You&apos;ll no longer receive daily prices, Marketing Score updates, or weather alerts.</p>
<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
<a href="${confirmUrl}" class="btn">Yes, Unsubscribe</a>
<a href="https://www.harvestfile.com/morning" class="btn-secondary">Keep Receiving</a>
</div></div></body></html>`;
}
