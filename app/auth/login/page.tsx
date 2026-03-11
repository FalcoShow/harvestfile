"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const authError = searchParams.get("error");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="lg:hidden flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <path d="M7 20h10" /><path d="M12 20V10" /><path d="M12 10c-2-2.96-6-3-6 0s4 4 6 2" /><path d="M12 10c2-2.96 6-3 6 0s-4 4-6 2" />
          </svg>
        </div>
        <span className="text-lg font-semibold text-white tracking-tight">HarvestFile</span>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
        <p className="mt-2 text-gray-400">Sign in to your dashboard to manage your portfolio.</p>
      </div>

      {(error || authError) && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">
            {error || (authError === "auth_callback_failed" ? "Authentication failed. Please try again." : authError === "verification_failed" ? "Email verification failed. Please try again." : "An error occurred. Please try again.")}
          </p>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email address</label>
          <input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 hover:border-white/[0.15]" placeholder="you@example.com" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
            <Link href="/auth/forgot-password" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">Forgot password?</Link>
          </div>
          <input id="password" name="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-4 py-3 text-white placeholder-gray-500 outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 hover:border-white/[0.15]" placeholder="••••••••" />
        </div>

        <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Signing in...
            </span>
          ) : "Sign in"}
        </button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-400">Don&apos;t have an account?{" "}<Link href="/auth/signup" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">Create one</Link></p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-white text-center py-12">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}