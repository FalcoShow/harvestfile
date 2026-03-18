// =============================================================================
// HarvestFile — Server Actions (Auth)
// Phase 13 Build 2: Auth Cleanup
//   - Fixed auth_user_id → auth_id to match actual DB column
//   - Every new org starts with 14-day Pro trial (not free tier)
// =============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  // If email confirmation is disabled, create org + professional immediately
  if (authData.user && authData.session) {
    // FIXED: column is auth_id (not auth_user_id)
    const { data: existingPro } = await supabase
      .from("professionals")
      .select("id")
      .eq("auth_id", authData.user.id)
      .single();

    if (!existingPro) {
      // Every new org starts with 14-day Pro trial
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      const { data: org } = await supabase
        .from("organizations")
        .insert({
          name: `${fullName}'s Organization`,
          subscription_tier: "pro",
          subscription_status: "trialing",
          trial_ends_at: trialEndsAt.toISOString(),
          max_farmers: 50,
          max_users: 1,
        })
        .select("id")
        .single();

      if (org) {
        // FIXED: column is auth_id (not auth_user_id)
        await supabase.from("professionals").insert({
          org_id: org.id,
          auth_id: authData.user.id,
          email,
          full_name: fullName,
          role: "admin",
        });

        await supabase.from("activity_log").insert({
          org_id: org.id,
          actor_id: authData.user.id,
          action: "user_signup",
          entity_type: "professional",
          description: `${email} created an account — 14-day Pro trial started`,
        });
      }
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  // Email confirmation required
  return { success: "Check your email to confirm your account." };
}
