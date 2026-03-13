import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // After OAuth sign-in, ensure user_profiles row exists
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Upsert profile — creates if doesn't exist, updates if it does
        await supabase.from('user_profiles').upsert(
          {
            id: user.id,
            email: user.email,
            full_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              null,
            subscription_tier: 'free',
            subscription_status: 'active',
          },
          { onConflict: 'id' }
        );
      }

      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  // OAuth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
