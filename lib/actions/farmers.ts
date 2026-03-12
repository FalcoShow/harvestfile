"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FarmerInput } from "@/types/database";

async function getProfessional(supabase: any, userId: string) {
  const { data } = await supabase
    .from("professionals")
    .select("id, org_id")
    .eq("auth_id", userId)
    .single();

  return data;
}

export async function getFarmers(search?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const pro = await getProfessional(supabase, user.id);
  if (!pro) return [];

  let query = supabase
    .from("farmers")
    .select("*, crops(count)")
    .eq("org_id", pro.org_id)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,business_name.ilike.%${search}%,county.ilike.%${search}%,state.ilike.%${search}%,fsa_farm_number.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching farmers:", error);
    return [];
  }

  return data || [];
}

export async function getFarmerById(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const pro = await getProfessional(supabase, user.id);
  if (!pro) return null;

  const { data, error } = await supabase
    .from("farmers")
    .select("*, crops(*)")
    .eq("id", id)
    .eq("org_id", pro.org_id)
    .single();

  if (error) {
    console.error("Error fetching farmer:", error);
    return null;
  }

  return data;
}

export async function createFarmer(input: FarmerInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const pro = await getProfessional(supabase, user.id);
  if (!pro) {
    return { error: "No organization found. Please contact support." };
  }

  const { data, error } = await supabase
    .from("farmers")
    .insert({
      ...input,
      org_id: pro.org_id,
      added_by: pro.id,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating farmer:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/farmers");
  return { data };
}

export async function updateFarmer(id: string, input: Partial<FarmerInput>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const pro = await getProfessional(supabase, user.id);
  if (!pro) return { error: "No organization found." };

  const { data, error } = await supabase
    .from("farmers")
    .update(input)
    .eq("id", id)
    .eq("org_id", pro.org_id)
    .select()
    .single();

  if (error) {
    console.error("Error updating farmer:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/farmers");
  revalidatePath(`/dashboard/farmers/${id}`);
  return { data };
}

export async function deleteFarmer(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const pro = await getProfessional(supabase, user.id);
  if (!pro) return { error: "No organization found." };

  const { error } = await supabase
    .from("farmers")
    .delete()
    .eq("id", id)
    .eq("org_id", pro.org_id);

  if (error) {
    console.error("Error deleting farmer:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard/farmers");
  redirect("/dashboard/farmers");
}
