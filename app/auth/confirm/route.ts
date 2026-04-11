import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  // Decode in case the next param arrived URL-encoded (e.g. /dashboard%3Fwelcome%3Dreturning)
  const next = decodeURIComponent(nextRaw);

  console.log("[AuthConfirm] hit", { hasTokenHash: !!token_hash, type, next });

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      console.log("[AuthConfirm] verifyOtp success, redirecting to", next);
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/" + next}`);
    }

    console.error("[AuthConfirm] verifyOtp failed:", error.message);
    return NextResponse.redirect(
      `${origin}/login?error=verification_failed&debug=${encodeURIComponent(error.message)}`
    );
  }

  console.error("[AuthConfirm] missing params", { token_hash: !!token_hash, type });
  return NextResponse.redirect(
    `${origin}/login?error=verification_failed&debug=missing_params`
  );
}