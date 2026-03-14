import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: existingPro } = await supabase
          .from("professionals")
          .select("id, org_id")
          .eq("auth_user_id", user.id)
          .single();

        if (!existingPro) {
          // First login — create org + professional record
          const { data: org } = await supabase
            .from("organizations")
            .insert({
              name: `${user.email?.split("@")[0]}'s Organization`,
              subscription_tier: "free",
              max_farmers: 10,
              max_users: 1,
            })
            .select("id")
            .single();

          if (org) {
            await supabase.from("professionals").insert({
              org_id: org.id,
              auth_user_id: user.id,
              email: user.email!,
              full_name:
                user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "User",
              role: "admin",
            });

            await supabase.from("activity_log").insert({
              org_id: org.id,
              actor_id: user.id,
              action: "user_signup",
              entity_type: "professional",
              description: `${user.email} created an account`,
            });

            // ── Phase 3D: Fire trial email sequence ──────────────
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
              // Don't block signup if Inngest fails
            }
            // ─────────────────────────────────────────────────────
          }
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
