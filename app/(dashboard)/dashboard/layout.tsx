import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./_components/Sidebar";
import DashboardHeader from "./_components/DashboardHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get professional record with org data
  const { data: professional } = await supabase
    .from("professionals")
    .select(
      `
      id,
      full_name,
      email,
      role,
      org_id,
      organizations (
        id,
        name,
        subscription_tier,
        max_farmers,
        max_users
      )
    `
    )
    .eq("auth_user_id", user.id)
    .single();

  // If no professional record exists yet, create one (edge case: direct signup without callback)
  if (!professional) {
    const { data: org } = await supabase
      .from("organizations")
      .insert({
        name: `${user.email?.split("@")[0]}'s Organization`,
        subscription_tier: "free",
        max_farmers: 10,
        max_users: 1,
      })
      .select("id, name, subscription_tier, max_farmers, max_users")
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

      // Refresh the page to get the new data
      redirect("/dashboard");
    }
  }

  const orgData = professional?.organizations as unknown as {
    id: string;
    name: string;
    subscription_tier: string;
    max_farmers: number;
    max_users: number;
  };

  return (
    <div className="flex min-h-screen bg-[#0a0f0d]">
      <Sidebar
        user={{
          email: professional?.email || user.email || "",
          full_name: professional?.full_name || "User",
        }}
        org={{
          name: orgData?.name || "My Organization",
          subscription_tier: orgData?.subscription_tier || "free",
        }}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
