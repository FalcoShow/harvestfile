// =============================================================================
// HarvestFile — Trial Expired Page (Standalone)
// Build 3: Trial Gating
//
// Full-page takeover when trial expires. No sidebar, no dashboard chrome.
// Shows value recap of what user built during trial + upgrade CTA.
// Route: /trial-expired
// =============================================================================

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function TrialExpiredPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Check if user actually has an expired trial — if active, send to dashboard
  const { data: professional } = await supabase
    .from('professionals')
    .select(`
      org_id,
      full_name,
      organizations (
        subscription_status,
        subscription_tier,
        trial_ends_at
      )
    `)
    .eq('auth_user_id', user.id)
    .single();

  const org = professional?.organizations as unknown as {
    subscription_status: string;
    subscription_tier: string;
    trial_ends_at: string | null;
  } | null;

  // If subscription is active, they shouldn't be here
  if (org?.subscription_status === 'active') {
    redirect('/dashboard');
  }

  // Check if trial is actually expired
  const isTrialing = org?.subscription_status === 'trialing';
  const trialEnd = org?.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const trialActive = isTrialing && trialEnd && trialEnd > new Date();

  if (trialActive) {
    // Trial is still going — send them back to dashboard
    redirect('/dashboard');
  }

  // Get user's stats for value recap
  let farmerCount = 0;
  let cropCount = 0;
  let firstName = 'there';

  if (professional?.org_id) {
    const { count: farmers } = await supabase
      .from('farmers')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', professional.org_id);

    const { count: crops } = await supabase
      .from('farmer_crops')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', professional.org_id);

    farmerCount = farmers ?? 0;
    cropCount = crops ?? 0;
    firstName =
      professional.full_name?.split(' ')[0] ||
      user.email?.split('@')[0] ||
      'there';
  }

  return (
    <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-400"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
          Your free trial has ended
        </h1>

        <p className="text-white/50 text-base mb-8 leading-relaxed">
          Hey {firstName}, your 14-day Pro trial has expired. Subscribe to keep
          access to your dashboard and farm data.
        </p>

        {/* Value Recap */}
        {(farmerCount > 0 || cropCount > 0) && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-8">
            <p className="text-white/40 text-xs uppercase tracking-wider font-medium mb-3">
              What you&apos;ve built so far
            </p>
            <div className="flex items-center justify-center gap-8">
              {farmerCount > 0 && (
                <div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {farmerCount}
                  </div>
                  <div className="text-xs text-white/40">
                    farmer{farmerCount !== 1 ? 's' : ''} tracked
                  </div>
                </div>
              )}
              {cropCount > 0 && (
                <div>
                  <div className="text-2xl font-bold text-emerald-400">
                    {cropCount}
                  </div>
                  <div className="text-xs text-white/40">
                    crop{cropCount !== 1 ? 's' : ''} managed
                  </div>
                </div>
              )}
            </div>
            <p className="text-white/30 text-xs mt-3">
              Your data is safe. Subscribe to pick up right where you left off.
            </p>
          </div>
        )}

        {/* Pricing CTA */}
        <div className="space-y-3 mb-8">
          <Link
            href="/pricing"
            className="block w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30 transition-all text-sm"
          >
            View Plans & Subscribe
          </Link>
          <p className="text-white/30 text-xs">
            Plans start at $49/month. Cancel anytime.
          </p>
        </div>

        {/* Social proof */}
        <div className="border-t border-white/[0.06] pt-6">
          <p className="text-white/30 text-xs mb-4">
            Trusted by farmers and ag professionals across America
          </p>
          <div className="flex items-center justify-center gap-6 text-white/20 text-xs">
            <span>ARC/PLC optimization</span>
            <span className="text-white/10">·</span>
            <span>Live USDA data</span>
            <span className="text-white/10">·</span>
            <span>AI-powered reports</span>
          </div>
        </div>

        {/* Secondary actions */}
        <div className="mt-8 flex items-center justify-center gap-4 text-xs">
          <Link
            href="/check"
            className="text-white/30 hover:text-white/50 transition-colors"
          >
            Free Calculator
          </Link>
          <span className="text-white/10">·</span>
          <Link
            href="mailto:hello@harvestfile.com"
            className="text-white/30 hover:text-white/50 transition-colors"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
