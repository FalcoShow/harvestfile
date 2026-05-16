import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // FIXED: column is auth_id (not auth_user_id)
  const { data: professional } = await supabase
    .from("professionals")
    .select(
      `
      full_name,
      email,
      role,
      organizations (
        name,
        subscription_tier,
        max_farmers,
        max_users
      )
    `
    )
    .eq("auth_id", user!.id)
    .single();

  const org = professional?.organizations as unknown as {
    name: string;
    subscription_tier: string;
    max_farmers: number;
    max_users: number;
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-gray-400 mt-1">
          Manage your account, organization, and subscription.
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Profile
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <div className="px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white">
              {professional?.full_name || "—"}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Email</label>
            <div className="px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white">
              {professional?.email || "—"}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Role</label>
            <div className="px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white capitalize">
              {professional?.role || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Organization */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Organization
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Organization Name
            </label>
            <div className="px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white">
              {org?.name || "—"}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Plan</label>
            <div className="px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white capitalize">
              {org?.subscription_tier || "—"}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Farmer Limit
            </label>
            <div className="px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white">
              {org?.max_farmers || "—"}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              User Seats
            </label>
            <div className="px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-white">
              {org?.max_users || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription management */}
      <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 p-6">
        <h3 className="text-lg font-bold text-white">Manage Subscription</h3>
        <p className="text-gray-400 mt-1">
          {org?.subscription_tier === "pro"
            ? "You're on the Pro plan. Upgrade to Team to manage multiple producers."
            : "View and manage your subscription, billing, and payment methods."}
        </p>
        <div className="flex gap-3 mt-4">
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 transition-all"
          >
            View Plans
          </a>
        </div>
      </div>
    </div>
  );
}
