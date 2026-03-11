"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // If session exists immediately (email confirmation disabled), create org
    if (data.user && data.session) {
      const { data: existingPro } = await supabase
        .from("professionals")
        .select("id")
        .eq("auth_user_id", data.user.id)
        .single();

      if (!existingPro) {
        const { data: org } = await supabase
          .from("organizations")
          .insert({
            name: `${fullName}'s Organization`,
            subscription_tier: "free",
            max_farmers: 10,
            max_users: 1,
          })
          .select("id")
          .single();

        if (org) {
          await supabase.from("professionals").insert({
            org_id: org.id,
            auth_user_id: data.user.id,
            email,
            full_name: fullName,
            role: "admin",
          });

          await supabase.from("activity_log").insert({
            org_id: org.id,
            actor_id: data.user.id,
            action: "user_signup",
            entity_type: "professional",
            description: `${email} created an account`,
          });
        }
      }

      router.push("/dashboard");
      router.refresh();
      return;
    }

    // Email confirmation required
    setSuccess(
      "Account created! Check your email for a confirmation link."
    );
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-400"
          >
            <path d="M7 20h10" />
            <path d="M12 20V10" />
            <path d="M12 10c-2-2.96-6-3-6 0s4 4 6 2" />
            <path d="M12 10c2-2.96 6-3 6 0s-4 4-6 2" />
          </svg>
        </div>
        <span className="text-lg font-semibold text-white tracking-tight">
          HarvestFile
        </span>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Create your account
        </h2>
        <p className="mt-2 text-gray-400">
          Start managing farmer portfolios in minutes.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
          <p className="text-sm text-emerald-400">{success}</p>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="full_name"
            className="block text-sm font-medium text-gray-300"
          >
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 hover:border-white/[0.15]"
            placeholder="John Smith"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-300"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 hover:border-white/[0.15]"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-300"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 hover:border-white/[0.15]"
            placeholder="Min. 8 characters"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="text-gray-400 hover:text-gray-300 underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-gray-400 hover:text-gray-300 underline">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
