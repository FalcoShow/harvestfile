// app/auth/callback/route.ts
// =============================================================================
// HarvestFile — OAuth + Magic Link Callback Handler
// Build 9 Deploy 3: Cookie-based fragment-flow session setup
//
// Flow A — Google OAuth or PKCE magic link (query string):
//   /auth/callback?code=... → exchange → set cookie → redirect
//
// Flow B — OTP magic link (query string):
//   /auth/callback?token_hash=...&type=... → verifyOtp → set cookie → redirect
//
// Flow C — Implicit-flow magic link (fragment tokens):
//   /auth/callback#access_token=...&refresh_token=...
//   Server returns HTML that POSTs the tokens to /api/auth/exchange-tokens,
//   which uses @supabase/ssr to set the session cookie server-side.
//   Then we redirect to the appropriate destination.
// =============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';
import { getOrCreateCustomer } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const welcome = searchParams.get('welcome');
  const nextParam = searchParams.get('next') ?? '/dashboard';
  const next = welcome ? `${nextParam}?welcome=${welcome}` : nextParam;

  // ── FLOW C: No code AND no token_hash in query string ─────────────────────
  // The token is likely in the URL fragment. Return HTML that reads the
  // fragment, POSTs the tokens to our /api/auth/exchange-tokens endpoint
  // (which sets the cookie server-side using @supabase/ssr), then redirects.
  if (!code && !token_hash) {
    return new Response(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Signing you in… — HarvestFile</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0a0f0d;
      color: #E8F0EB;
      font-family: 'Bricolage Grotesque', system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      max-width: 420px;
      padding: 40px 24px;
    }
    h1 {
      font-size: 22px;
      font-weight: 500;
      letter-spacing: -0.024em;
      margin: 16px 0 8px;
    }
    p {
      color: rgba(232, 240, 235, 0.55);
      font-size: 15px;
      line-height: 1.5;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(52, 211, 153, 0.20);
      border-top-color: #34D399;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error {
      color: #F97316;
      background-color: rgba(249, 115, 22, 0.10);
      border: 1px solid rgba(249, 115, 22, 0.30);
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 20px;
      font-size: 14px;
      text-align: left;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner" id="spinner"></div>
    <h1 id="title">Signing you in…</h1>
    <p id="message">One moment.</p>
    <div class="error" id="error"></div>
  </div>
  <script>
    (function() {
      var titleEl = document.getElementById('title');
      var msgEl = document.getElementById('message');
      var errorEl = document.getElementById('error');
      var spinnerEl = document.getElementById('spinner');

      function showError(text) {
        spinnerEl.style.display = 'none';
        titleEl.textContent = 'Sign-in failed';
        msgEl.textContent = '';
        errorEl.textContent = text;
        errorEl.style.display = 'block';
        setTimeout(function() {
          window.location.href = '/login?error=auth_callback_failed&debug=' + encodeURIComponent(text);
        }, 2500);
      }

      var hash = window.location.hash;
      if (!hash || hash.length < 2) {
        showError('No authentication token found in URL.');
        return;
      }

      var params = new URLSearchParams(hash.substring(1));
      var accessToken = params.get('access_token');
      var refreshToken = params.get('refresh_token');

      if (!accessToken || !refreshToken) {
        showError('Authentication token is incomplete.');
        return;
      }

      // POST tokens to our server endpoint which sets the session cookie
      // using @supabase/ssr (the same library middleware uses to read it)
      fetch('/api/auth/exchange-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          welcome: ${JSON.stringify(welcome ?? '')}
        })
      })
      .then(function(res) {
        return res.json().then(function(data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function(result) {
        if (!result.ok) {
          showError(result.data.error || 'Server failed to set session.');
          return;
        }

        titleEl.textContent = 'Signed in';
        msgEl.textContent = 'Redirecting…';

        // Clear the fragment from URL and redirect
        // Use replace() so back button doesn't return to /auth/callback
        setTimeout(function() {
          window.location.replace(result.data.redirect || '/dashboard');
        }, 400);
      })
      .catch(function(err) {
        showError('Network error: ' + (err && err.message ? err.message : String(err)));
      });
    })();
  </script>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  // ── FLOW A or B: Token came in as query string ────────────────────────────
  let error: any = null;
  let lastErrorMessage = '';

  const supabase = await createClient();

  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
    if (error) lastErrorMessage = `oauth:${error.message}`;
  } else if (token_hash) {
    const result = await supabase.auth.verifyOtp({ token_hash, type: 'email' as any });
    error = result.error;
    if (error) {
      lastErrorMessage = `magiclink_email:${error.message}`;
      if (type) {
        const fallback = await supabase.auth.verifyOtp({ token_hash, type: type as any });
        if (!fallback.error) {
          error = null;
          lastErrorMessage = '';
        } else {
          lastErrorMessage += ` | ${type}:${fallback.error.message}`;
        }
      }
    }
  }

  console.log('[AuthCallback] result:', { hasCode: !!code, hasTokenHash: !!token_hash, type, lastErrorMessage });

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=auth_callback_failed&debug=${encodeURIComponent(lastErrorMessage || 'no_error_captured')}`
    );
  }

  await provisionUserOnFirstLogin(supabase);
  const redirectTarget = await determineRedirectTarget(supabase, next);

  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${redirectTarget}`);
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${redirectTarget}`);
  } else {
    return NextResponse.redirect(`${origin}${redirectTarget}`);
  }
}

// =============================================================================
// Provisioning logic — preserved verbatim from Build 9 Deploy 1
// =============================================================================

async function provisionUserOnFirstLogin(supabase: any): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Skip provisioning entirely for Sell Score subscribers — they have a farms
  // record from the Stripe webhook, no professionals/organizations row needed.
  const { data: farm } = await supabase
    .from('farms')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle();

  if (farm) return;

  const { data: existingPro } = await supabase
    .from('professionals')
    .select('id, org_id')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (existingPro) return;

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const { data: org } = await supabase
    .from('organizations')
    .insert({
      name: `${user.email?.split('@')[0]}'s Organization`,
      subscription_tier: 'pro',
      subscription_status: 'trialing',
      trial_ends_at: trialEndsAt.toISOString(),
      max_farmers: 50,
      max_users: 1,
    })
    .select('id')
    .single();

  if (!org) return;

  await supabase.from('professionals').insert({
    org_id: org.id,
    auth_id: user.id,
    email: user.email!,
    full_name:
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'User',
    role: 'admin',
  });

  try {
    const stripeCustomerId = await getOrCreateCustomer(
      user.email!,
      user.id,
      user.user_metadata?.full_name
    );
    await supabase
      .from('organizations')
      .update({
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', org.id);
  } catch (stripeErr) {
    console.error('[AuthCallback] Stripe customer creation failed:', stripeErr);
  }

  await supabase.from('activity_log').insert({
    org_id: org.id,
    actor_id: user.id,
    action: 'user_signup',
    entity_type: 'professional',
    description: `${user.email} created an account — 14-day Pro trial started`,
  });

  try {
    await inngest.send({
      name: 'app/user.trial_started',
      data: {
        userId: user.id,
        email: user.email!,
        firstName:
          user.user_metadata?.full_name?.split(' ')[0] ||
          user.email?.split('@')[0] ||
          'there',
      },
    });
  } catch (err) {
    console.error('[Inngest] Failed to fire trial_started:', err);
  }
}

// =============================================================================
// Redirect target — Sell Score farms route to /onboard or /sellscore/me
// =============================================================================

async function determineRedirectTarget(supabase: any, fallback: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return fallback;

  const { data: farm } = await supabase
    .from('farms')
    .select('id, sellscore_setup_complete')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (farm) {
    return farm.sellscore_setup_complete ? '/sellscore/me' : '/onboard';
  }

  return fallback;
}
