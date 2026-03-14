"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { CropInput } from "@/types/database";

async function getProfessional(supabase: any, userId: string) {
  const { data } = await supabase
    .from("professionals")
    .select("id, org_id")
    .eq("auth_id", userId)
    .single();

  return data;
}

export async function getCropsByFarmerId(farmerId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const pro = await getProfessional(supabase, user.id);
  if (!pro) return [];

  // Verify farmer belongs to user's org
  const { data: farmer } = await supabase
    .from("farmers")
    .select("id")
    .eq("id", farmerId)
    .eq("org_id", pro.org_id)
    .single();

  if (!farmer) return [];

  const { data, error } = await supabase
    .from("crops")
    .select("*")
    .eq("farmer_id", farmerId)
    .order("crop_type", { ascending: true });

  if (error) {
    console.error("Error fetching crops:", error);
    return [];
  }

  return data || [];
}

export async function createCrop(input: CropInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const pro = await getProfessional(supabase, user.id);
  if (!pro) {
    return { error: "No organization found." };
  }

  // Verify farmer belongs to user's org
  const { data: farmer } = await supabase
    .from("farmers")
    .select("id")
    .eq("id", input.farmer_id)
    .eq("org_id", pro.org_id)
    .single();

  if (!farmer) {
    return { error: "Farmer not found" };
  }

  const { data, error } = await supabase
    .from("crops")
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error("Error creating crop:", error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/farmers/${input.farmer_id}`);
  return { data };
}

export async function updateCrop(
  id: string,
  farmerId: string,
  input: Partial<CropInput>
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("crops")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating crop:", error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/farmers/${farmerId}`);
  return { data };
}

export async function deleteCrop(id: string, farmerId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.from("crops").delete().eq("id", id);

  if (error) {
    console.error("Error deleting crop:", error);
    return { error: error.message };
  }

  revalidatePath(`/dashboard/farmers/${farmerId}`);
  return { success: true };
}
